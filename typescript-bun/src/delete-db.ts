import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function clearAll() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  await db.execute(
    `TRUNCATE TABLE chat_messages, chat_sessions, meeting_parts, meetings, users, roles RESTART IDENTITY CASCADE;`
  );
  await pool.end();
  console.log("Semua tabel dikosongkan");
}

clearAll().catch(console.error);