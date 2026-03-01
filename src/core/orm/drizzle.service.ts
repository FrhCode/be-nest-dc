import config from '@/core/config';
import * as schema from '@/db';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  public readonly db: NodePgDatabase<typeof schema>;

  private pool: Pool;

  constructor(configService: ConfigService) {
    const database =
      configService.getOrThrow<ReturnType<typeof config>['database']>(
        'database',
      );

    this.pool = new Pool({
      host: database.host,
      port: database.port,
      database: database.name,
      user: database.username,
      password: database.password,
    });

    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
