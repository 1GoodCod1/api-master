import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { readReplicas } from '@prisma/extension-read-replicas';

interface PoolConnectClient {
  connection?: {
    stream?: {
      setKeepAlive?: (enable: boolean, initialDelayMs: number) => void;
    };
  };
}

interface PgPool {
  on(event: 'connect', listener: (client: PoolConnectClient) => void): void;
  end(): Promise<void>;
}

function attachKeepAliveToPool(pool: PgPool): void {
  // TCP keepAlive so idle connections aren't dropped by network/load balancers
  pool.on('connect', (client) => {
    try {
      client.connection?.stream?.setKeepAlive?.(true, 60_000);
    } catch {
      // ignore keepalive setup errors
    }
  });
}

function createPgPool(connectionString: string): PgPool {
  const isTest = process.env.NODE_ENV === 'test';
  // pg Pool types may not resolve in eslint's type-aware analysis
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Pool from pg
  const rawPool: unknown = new Pool({
    connectionString,
    max: isTest ? 3 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // 10s for Docker/cold DB; was 2s
    allowExitOnIdle: true,
  });
  const pool = rawPool as PgPool;

  attachKeepAliveToPool(pool);
  return pool;
}

async function closePgPool(pool: PgPool | undefined): Promise<void> {
  if (!pool) {
    return;
  }

  try {
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
  private pool: PgPool;
  private replicaPools: PgPool[] = [];
  private replicaClients: PrismaClient[] = [];
  private readonly extendedClient: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const pool = createPgPool(connectionString);

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    this.pool = pool;

    if (process.env.DATABASE_READ_URL) {
      const poolReplica = createPgPool(process.env.DATABASE_READ_URL);

      const adapterReplica = new PrismaPg(poolReplica);
      const replicaClient = new PrismaClient({
        adapter: adapterReplica,
        log:
          process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
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
      if (process.env.NODE_ENV === 'production') {
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
    if (process.env.NODE_ENV === 'production') return;

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
