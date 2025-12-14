import { createAgent, SystemMessage } from "langchain";
import * as z from "zod";
import { tool } from "@langchain/core/tools";
import {
  PGVectorStore,
  type DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { type PoolConfig } from "pg";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

// Pastikan env tersedia
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY wajib diisi");
if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY wajib diisi");
if (!process.env.MODEL) throw new Error("MODEL wajib diisi");

// Embeddings Pinecone (1024 dim)
const embedder = new PineconeEmbeddings({
  apiKey: process.env.PINECONE_API_KEY,
  model: "multilingual-e5-large",
});

// Konfigurasi PGVectorStore mengikuti schema meeting_parts
const config = {
  postgresConnectionOptions: {
    connectionString: process.env.DATABASE_URL,
  } as PoolConfig,
  tableName: "meeting_parts",
  columns: {
    idColumnName: "id",
    vectorColumnName: "embedding",
    contentColumnName: "file_url", // text
    metadataColumnName: "transcript", // jsonb { text, chunk_index, source }
  },
  distanceStrategy: "cosine" as DistanceStrategy,
  dimensions: 1024,
};

const vectorStore = await PGVectorStore.initialize(embedder, config);

// Tool retrieve dengan filter source (nama file dari seed)
const retrieveSchema = z.object({
  query: z.string(),
  source: z.string().optional(),
});

const retrieve = tool(
  async ({ query, source }) => {
    const filter = source
      ? { source }
      : undefined;
    const docs = await vectorStore.similaritySearch(query, 3, filter);
    const serialized = docs
      .map(
        (doc) => `Source: ${doc.metadata?.source}\nContent: ${doc.pageContent}`
      )
      .join("\n\n");
    return [serialized, docs];
  },
  {
    name: "retrieve",
    description: "Ambil konteks dari meeting_parts dengan filter source optional.",
    schema: retrieveSchema,
    responseFormat: "content_and_artifact",
  }
);

const model = new ChatOpenAI({
  model: process.env.MODEL,
  apiKey: process.env.GROQ_API_KEY,
  configuration: { baseURL: "https://api.groq.com/openai/v1" },
});

const tools = [retrieve];
const systemPrompt = new SystemMessage(
  "You have access to a tool that retrieves context from meeting transcripts. " +
  "Use the tool to answer user queries with relevant context."
);

const agent = createAgent({
  model,
  tools,
  systemPrompt: systemPrompt.content as string,
});

const inputMessage = `Cari siapa host podcast dan ringkas konteksnya.`;
const agentInputs = {
  messages: [
    { role: "user", content: inputMessage },
  ],
  // contoh filter: ambil hanya sumber file tertentu
  // params lain bisa dikirim via tool args, tapi untuk demo sederhana,
  // kita hardcode di query ke tool melalui content
};

export async function processRAGQuery(userMessage: string): Promise<string> {
  try {
    const agentInputs = {
      messages: [
        { role: "user", content: userMessage },
      ],
    };

    const stream = await agent.stream(agentInputs, { streamMode: "values" });
    let finalResponse = "";
    
    for await (const step of stream) {
      const lastMessage = step.messages[step.messages.length - 1];
      if (lastMessage.role === "assistant" || lastMessage.role === "ai") {
        finalResponse = lastMessage.content;
      }
    }
    
    return finalResponse;
  } catch (err) {
    console.error("Gagal menjalankan RAG:", err);
    throw new Error(`RAG query failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

const main = async () => {
  try {
    const inputMessage = `Cari siapa host podcast dan ringkas konteksnya.`;
    const result = await processRAGQuery(inputMessage);
    console.log("RAG Result:", result);
    process.exit(0);
  } catch (err) {
    console.error("Gagal menjalankan RAG:", err);
    process.exit(1);
  }
};

// Hanya jalankan main jika file ini dieksekusi langsung
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}