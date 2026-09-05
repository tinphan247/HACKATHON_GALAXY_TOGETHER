import { pool } from '../src/db.js';

async function runMigration() {
  console.log('🔄 Running migration: add seat_hold_started_at & seat_hold_expires_at to group_sessions...');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS seat_hold_started_at TIMESTAMP NULL;
      ALTER TABLE group_sessions ADD COLUMN IF NOT EXISTS seat_hold_expires_at TIMESTAMP NULL;
    `);
    console.log('✅ Migration successful: columns added or already exist!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
