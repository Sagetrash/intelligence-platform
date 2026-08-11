import fs, { readdirSync } from 'fs';
import { pool } from './index'
import path from 'path';

async function runMigrations() {
  console.log(`[Migration] started database migration runner...`);
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations(
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    );

    const migrationDir = path.join(__dirname, 'migrations');
    const files = readdirSync(migrationDir)
      .filter((file) => file.endsWith(`.sql`))
      .sort();

    const { rows } = await client.query(`SELECT name FROM schema_migrations;`);
    const applied = new Set(rows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[Migration] skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying migration: ${file}`);
      const filePath = path.join(migrationDir, file);
      const sql = fs.readFileSync(filePath,'utf-8');

      await client.query(`BEGIN`);
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
      await client.query('COMMIT');

      console.log(`[Migration] Successfully applied : ${file}`);
    }
    console.log(`[Migration] All migrations applied Successfully.`);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`[Migration] Migration failed! Transaction rolled back.`, err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();