import * as dotenv from 'dotenv';
import { type NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { seed } from 'drizzle-seed';
import { exit } from 'process';

import * as allSchema from './schema';

dotenv.config();

(async () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  let db: NodePgDatabase<typeof allSchema> | null = null;
  db = drizzle(pool, {
    schema: {
      ...allSchema,
    },
  });
  await seed(db, { units: allSchema.units }).refine((f) => ({
    units: {
      columns: {
        name: f.valuesFromArray({
          values: ['kg', 'g', 'unit'],
          isUnique: true,
        }),
      },
      count: 3,
    },
  }));
  exit(0);
})();
