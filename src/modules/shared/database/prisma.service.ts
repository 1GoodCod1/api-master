import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { Pool, PoolClient } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { readReplicas } from '@prisma/extension-read-replicas';

const STATEMENT_TIMEOUT_MS = 60_000; // 60s max per query to prevent pool exhaustion

/** pg's PoolClient has internal `connection.stream` at runtime; @types/pg omits it */
type PoolClientWithStream = PoolClient & {
  connection?: {
    stream?: {
      setKeepAlive?: (enable: boolean, initialDelayMs: number) => void;
    };
  };
};

function attachKeepAliveToPool(pool: Pool): void {
  pool.on('connect', (client: PoolClient) => {
    const c = client as PoolClientWithStream;
    try {
      c.connection?.stream?.setKeepAlive?.(true, 60_000);
    } catch {
      // ignore keepalive setup errors
    }
    // Limit query duration to prevent long-running queries from exhausting the pool
    if (typeof client.query === 'function') {
      void client
        .query(`SET statement_timeout = '${STATEMENT_TIMEOUT_MS}'`)
        .catch(() => {});
    }
  });
}

function createPgPool(
  connectionString: string,
  nodeEnv: string = process.env.NODE_ENV || 'development',
): Pool {
  const isTest = nodeEnv === 'test';

  const pool = new Pool({
    connectionString,
    max: isTest ? 3 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 10s for Docker/cold DB; was 2s
    allowExitOnIdle: true,
  });

  attachKeepAliveToPool(pool);
  return pool;
}

async function closePgPool(pool: Pool | undefined): Promise<void> {
  if (!pool) {
    return;
  }

  try {
    pool.removeAllListeners();
    await pool.end();
  } catch {
    // ignore pool end errors
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly replicaPools: Pool[] = [];
  private readonly replicaClients: PrismaClient[] = [];
  private readonly extendedClient: PrismaClient;
  private readonly nodeEnv: string;

  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('database.url');
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const nodeEnv = configService.get<string>('nodeEnv', 'development');
    const pool = createPgPool(connectionString, nodeEnv);

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        nodeEnv === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    this.pool = pool;
    this.nodeEnv = nodeEnv;

    const readUrl = configService.get<string>('database.readUrl');
    if (readUrl) {
      const poolReplica = createPgPool(readUrl, nodeEnv);

      const adapterReplica = new PrismaPg(poolReplica);
      const replicaClient = new PrismaClient({
        adapter: adapterReplica,
        log: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
      });

      this.replicaPools.push(poolReplica);
      this.replicaClients.push(replicaClient);

      this.extendedClient = this.$extends(
        readReplicas({
          replicas: [replicaClient],
        }),
      ) as unknown as PrismaClient;
    } else {
      this.extendedClient = this;
    }
  }

  async onModuleInit() {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Database connection timeout')),
          5000,
        );
      });
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      if (this.nodeEnv === 'production') {
        throw error;
      }
      console.warn(
        '⚠️ Continuing without database connection (development mode)',
      );
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    await closePgPool(this.pool);

    // Close all replica pools and clients
    for (const replicaClient of this.replicaClients) {
      try {
        await replicaClient.$disconnect();
      } catch {
        // ignore
      }
    }
    for (const replicaPool of this.replicaPools) {
      await closePgPool(replicaPool);
    }
  }

  async cleanDatabase(): Promise<void> {
    if (this.nodeEnv === 'production') return;

    const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');

    await Promise.all(
      models.map((modelKey) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- dynamic Prisma model access for dev cleanup
          return this[modelKey].deleteMany();
        } catch {
          return Promise.resolve();
        }
      }),
    );
  }
}
