import {
  PGVectorStore,
  type DistanceStrategy,
} from "@langchain/community/vectorstores/pgvector";
import { PineconeEmbeddings } from "@langchain/pinecone";
import { type PoolConfig } from "pg";

import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL wajib diisi");
}
if (!process.env.PINECONE_API_KEY) {
  throw new Error("PINECONE_API_KEY wajib diisi");
}

const embedder = new PineconeEmbeddings({
  apiKey: process.env.PINECONE_API_KEY,
  model: "multilingual-e5-large",
});

// Sample config
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
  // supported distance strategies: cosine (default), innerProduct, or euclidean
  distanceStrategy: "cosine" as DistanceStrategy,
  dimensions: 1024, // multilingual-e5-large output
};

const vectorStore = await PGVectorStore.initialize(embedder, config);

// Filter mengikuti bentuk kolom transcript (jsonb) dari seed: { text, chunk_index, source }
const filter = { source: "Malaka Cinematic Podcast Reza Arap Oktovian.txt" };

const similaritySearchResults = await vectorStore.similaritySearch(
  "siapa host podcast",
  3,
  filter
);

for (const doc of similaritySearchResults) {
  console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
}