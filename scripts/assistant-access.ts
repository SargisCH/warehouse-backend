import 'dotenv/config';
import { Pool } from 'pg';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const [email, access] = process.argv.slice(2);
  if (!email || !['NONE', 'CONTRIBUTOR', 'DEVELOPER'].includes(access))
    throw new Error(
      'Usage: npm run assistant:access -- email NONE|CONTRIBUTOR|DEVELOPER',
    );
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(
      'UPDATE users SET assistant_access = $1 WHERE email = $2 RETURNING email, assistant_access',
      [access, email],
    );
    if (result.rowCount !== 1) throw new Error('Account not found');
    console.log(result.rows[0]);
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
