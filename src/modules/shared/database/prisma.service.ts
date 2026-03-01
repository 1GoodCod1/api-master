import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    // pg Pool types may not resolve in eslint's type-aware analysis
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Pool from pg
    const pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // 10s for Docker/cold DB; was 2s
      allowExitOnIdle: true,
    }) as Pool;

    // TCP keepAlive so idle connections aren't dropped by network/load balancers
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- Pool from pg
    pool.on(
      'connect',
      (client: {
        connection?: {
          stream?: {
            setKeepAlive?: (enable: boolean, initialDelayMs: number) => void;
          };
        };
      }) => {
        try {
          client.connection?.stream?.setKeepAlive?.(true, 60_000);
        } catch {
          // ignore if stream doesn't support keepAlive
        }
      },
    );

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- pool from pg Pool, typed above
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Database connection timeout')),
          5000,
        ),
      );

      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      console.warn(
        '⚠️ Continuing without database connection (development mode)',
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    if (this.pool) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- Pool from pg
        await this.pool.end();
      } catch {
        // ignore pool end errors
      }
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
