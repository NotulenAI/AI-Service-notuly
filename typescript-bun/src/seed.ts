import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { meeting_parts, meetings } from "./db/schema.js";
import { PineconeEmbeddings } from "@langchain/pinecone";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(
  __dirname,
  "data",
  "Malaka Cinematic Podcast Reza Arap Oktovian.txt",
);
const MEETING_TITLE = "Malaka Cinematic Podcast - Reza Arap Oktovian";

async function seed() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
  if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY wajib diisi");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  const embedder = new PineconeEmbeddings({
    apiKey: process.env.PINECONE_API_KEY,
    model: "multilingual-e5-large",
  });

  const text = await fs.readFile(DATA_FILE, "utf8");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1600,
    chunkOverlap: 0,
  });
  
  const chunks = await splitter.splitText(text);
  console.log(`Chunk siap: ${chunks.length}`);
  const embeddings = await embedder.embedDocuments(chunks);
  console.log(`Embedding siap: ${embeddings.length}`);

  const found = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(eq(meetings.name, MEETING_TITLE));
  
  const meetingId =
    found[0]?.id ||
    (
      await db
        .insert(meetings)
        .values({
          name: MEETING_TITLE,
          agenda: "Impor otomatis",
          note: `Sumber: ${path.basename(DATA_FILE)}`,
        })
        .returning({ id: meetings.id })
    )[0]!.id;
  
  await db.delete(meeting_parts).where(eq(meeting_parts.meeting_id, meetingId));
  
  await db.insert(meeting_parts).values(
    chunks.map((c, idx) => ({
      start_time: new Date(Date.now() + idx * 5 * 60 * 1000),
      end_time: null,
      keywords: null,
      action_items: null,
      participants: [],
      meeting_id: meetingId,
      file_url: DATA_FILE,
      transcript: { text: c, chunk_index: idx, source: path.basename(DATA_FILE) },
      embedding: embeddings[idx],
      status: "uploaded",
      created_at: new Date(),
      created_by: null,
    })),
  );

  console.log("Seed selesai");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
