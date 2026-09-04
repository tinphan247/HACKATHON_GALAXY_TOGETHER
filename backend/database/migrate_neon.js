/**
 * Database Migration Script for Neon Serverless PostgreSQL
 * Phase 1: Domain & Database Foundation
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("ERROR: DATABASE_URL is not defined in .env");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrate() {
  console.log("Connecting to Neon PostgreSQL...");
  const client = await pool.connect();
  
  try {
    const dbInfo = await client.query("SELECT current_database(), current_user, version()");
    console.log(`Connected successfully!`);
    console.log(`  Database: ${dbInfo.rows[0].current_database}`);
    console.log(`  User:     ${dbInfo.rows[0].current_user}`);
    console.log(`  Version:  ${dbInfo.rows[0].version.split(',')[0]}`);
    console.log("--------------------------------------------------");

    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading DDL script: ${schemaPath}`);
    const ddl = fs.readFileSync(schemaPath, 'utf-8');

    console.log("Executing DDL migration on Neon PostgreSQL...");
    await client.query(ddl);
    console.log("DDL executed successfully!");
    console.log("--------------------------------------------------");

    // Verify created tables
    console.log("Verifying created tables in 'public' schema:");
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tablesRes = await client.query(tablesQuery);
    
    for (const row of tablesRes.rows) {
      const colQuery = `
        SELECT count(*) as count 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1;
      `;
      const colRes = await client.query(colQuery, [row.table_name]);
      console.log(`  [Table] ${row.table_name.padEnd(20)} (${colRes.rows[0].count} columns)`);
    }

    // Verify partial unique index on seat_holds
    console.log("--------------------------------------------------");
    console.log("Verifying Concurrency Unique Constraint on seat_holds:");
    const indexQuery = `
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'seat_holds' AND indexname = 'uq_active_seat_hold';
    `;
    const indexRes = await client.query(indexQuery);
    if (indexRes.rows.length > 0) {
      console.log(`  [Index] ${indexRes.rows[0].indexname}`);
      console.log(`  [Definition] ${indexRes.rows[0].indexdef}`);
    } else {
      console.warn("  [Warning] uq_active_seat_hold not found!");
    }

    console.log("--------------------------------------------------");
    console.log("Neon PostgreSQL Database Hosting is READY for Galaxy Together!");

  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
