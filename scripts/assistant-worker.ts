import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/drizzle/schema';
import { GeminiClient } from '../src/modules/assistant/gemini.client';
import { AssistantProcessor } from '../src/modules/assistant/assistant.processor';
import { ImplementationRunner } from '../src/modules/assistant/implementation.runner';
import { PlanEmailWorker } from '../src/modules/assistant/assistant-email';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!process.env.GEMINI_API_KEY)
    console.log(
      'Gemini is not configured. AI jobs remain queued; email delivery can still run.',
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  const gemini = new GeminiClient();
  const processor = new AssistantProcessor(db, gemini);
  const coder = new ImplementationRunner(db, gemini);
  const mailer = new PlanEmailWorker(db);
  const emailOnly = process.argv.includes('--email-only');
  let stopping = false;
  process.on('SIGINT', () => {
    stopping = true;
  });
  process.on('SIGTERM', () => {
    stopping = true;
  });
  console.log(
    `Assistant worker started. Coding ${
      process.env.ASSISTANT_IMPLEMENTATION_ENABLED === 'true'
        ? 'enabled'
        : 'disabled'
    }.`,
  );
  try {
    do {
      const generated = emailOnly ? false : await processor.tick();
      const emailed = await mailer.tick();
      const implemented = emailOnly ? false : await coder.tick();
      if (process.argv.includes('--once')) break;
      if (!generated && !implemented && !emailed)
        await new Promise((resolve) => setTimeout(resolve, 3000));
    } while (!stopping);
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Assistant worker stopped. Verify database, Gemini and repository configuration.',
  );
  process.exitCode = 1;
});
