import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL wajib diatur untuk mengimpor bank soal.');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
const root = new URL('../banks/', import.meta.url);
const manifest = JSON.parse(await readFile(join(root.pathname, 'manifest.json'), 'utf8'));
try {
  for (const bank of manifest.banks) {
    const questions = JSON.parse(await readFile(join(root.pathname, bank.dataUrl.replace('./banks/', '')), 'utf8'));
    await pool.query(`INSERT INTO question_banks (id, name, block, version, schema_version, questions)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, block = EXCLUDED.block, version = EXCLUDED.version,
        schema_version = EXCLUDED.schema_version, questions = EXCLUDED.questions, updated_at = now()`,
      [bank.id, bank.name, bank.block, bank.version, bank.schema, JSON.stringify(questions)]);
    console.log(`Seeded ${bank.id}: ${questions.length} questions`);
  }
} finally { await pool.end(); }
