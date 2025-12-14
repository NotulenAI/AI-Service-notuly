import { readdirSync, readFileSync } from "fs";
import path from "path";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Konfigurasi LLM dengan Groq
export function createLLM(): ChatOpenAI {
  return new ChatOpenAI({
    model: process.env.MODEL,
    apiKey: process.env.GROQ_API_KEY,
    configuration: {
      baseURL: "https://api.groq.com/openai/v1",
    },
  });
}

// Fungsi untuk membaca semua chunk dari src/data
export function readAllChunks(): string[] {
  const dataDir = path.join(process.cwd(), "src", "data");

  // Ambil semua file chunk_*.txt lalu urutkan
  const files = readdirSync(dataDir)
    .filter(f => f.startsWith("chunk_") && f.endsWith(".txt"))
    .sort((a, b) => {
      const n1 = parseInt(a.match(/\d+/)?.[0] || "0");
      const n2 = parseInt(b.match(/\d+/)?.[0] || "0");
      return n1 - n2;
    });

  // Baca semua isi file jadi array
  return files.map(f => readFileSync(path.join(dataDir, f), "utf8"));
}

// Fungsi untuk summarize satu chunk
async function summarizeChunk(
  chunk: string,
  chunkIndex: number,
  llm: ChatOpenAI
): Promise<string> {
  console.log(`🔄 Memulai ringkasan chunk ${chunkIndex + 1}...`);

  const prompt = new PromptTemplate({
    inputVariables: ["chunk", "index"],
    template: "Buatlah ringkasan dari bagian #{index} ini:\n\n{chunk}",
  });

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  console.log(`📤 Mengirim request ke LLM untuk chunk ${chunkIndex + 1}...`);
  const summary = await chain.invoke({ chunk, index: chunkIndex + 1 });

  console.log(`✓ Chunk ${chunkIndex + 1} telah diringkas (${summary.length} karakter)`);
  return summary;
}

// Fungsi untuk summarize semua chunk secara parallel
export async function summarizeAllChunks(llm: ChatOpenAI): Promise<string[]> {
  const chunks = readAllChunks();
  console.log(`\n📚 Memproses ${chunks.length} chunk secara parallel...`);
  console.log(`📊 Total karakter yang akan diproses: ${chunks.reduce((sum, c) => sum + c.length, 0)} karakter\n`);

  // Proses semua chunk secara parallel menggunakan Promise.all
  const summaries = await Promise.all(
    chunks.map((chunk, index) => summarizeChunk(chunk, index, llm))
  );

  console.log(`\n✅ Semua ${chunks.length} chunk berhasil diringkas!\n`);
  return summaries;
}

// Fungsi untuk menggabungkan semua summary jadi satu summary final
export async function combineSummaries(
  summaries: string[],
  llm: ChatOpenAI
): Promise<string> {
  console.log(`\n🔗 Menggabungkan ${summaries.length} ringkasan menjadi satu...`);

  const combinedText = summaries
    .map((summary, index) => `=== Ringkasan Bagian ${index + 1} ===\n${summary}`)
    .join("\n\n");

  console.log(`📊 Total karakter ringkasan gabungan: ${combinedText.length} karakter`);

  const prompt = new PromptTemplate({
    inputVariables: ["summaries"],
    template:
      "Berikut adalah ringkasan dari beberapa bagian dokumen. " +
      "Buatlah satu ringkasan menyeluruh yang koheren dari semua bagian ini:\n\n{summaries}",
  });

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());

  console.log(`📤 Mengirim request ke LLM untuk penggabungan final...`);
  const finalSummary = await chain.invoke({ summaries: combinedText });

  console.log(`✓ Semua ringkasan telah digabungkan (${finalSummary.length} karakter)\n`);
  return finalSummary;
}

// Fungsi untuk summarize chunks dari file input
async function summarizeFileChunks(
  chunks: string[],
  llm: ChatOpenAI
): Promise<string[]> {
  console.log(`\n📚 Memproses ${chunks.length} chunk dari file secara parallel...`);
  console.log(`📊 Total karakter yang akan diproses: ${chunks.reduce((sum, c) => sum + c.length, 0)} karakter\n`);

  // Proses semua chunk secara parallel menggunakan Promise.all
  const summaries = await Promise.all(
    chunks.map((chunk, index) => summarizeChunk(chunk, index, llm))
  );

  console.log(`\n✅ Semua ${chunks.length} chunk berhasil diringkas!\n`);
  return summaries;
}

// Fungsi utama untuk proses end-to-end dengan file input
export async function processFileChunkSummarization(
  chunks: string[],
  llm: ChatOpenAI
): Promise<{
  individualSummaries: string[];
  finalSummary: string;
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Memulai proses summarization dari file...`);
  console.log(`${"=".repeat(60)}`);

  // 1. Summarize semua chunk secara parallel
  console.log(`\n📝 Tahap 1: Meringkas setiap chunk secara parallel`);
  const individualSummaries = await summarizeFileChunks(chunks, llm);

  // 2. Gabungkan semua summary jadi satu
  console.log(`📝 Tahap 2: Menggabungkan semua ringkasan`);
  const finalSummary = await combineSummaries(individualSummaries, llm);

  console.log(`${"=".repeat(60)}`);
  console.log(`🎉 Proses summarization selesai!`);
  console.log(`${"=".repeat(60)}\n`);

  return {
    individualSummaries,
    finalSummary,
  };
}

// Fungsi utama untuk proses end-to-end
export async function processChunkSummarization(llm: ChatOpenAI): Promise<{
  individualSummaries: string[];
  finalSummary: string;
}> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Memulai proses summarization...`);
  console.log(`${"=".repeat(60)}`);

  // 1. Summarize semua chunk secara parallel
  console.log(`\n📝 Tahap 1: Meringkas setiap chunk secara parallel`);
  const individualSummaries = await summarizeAllChunks(llm);

  // 2. Gabungkan semua summary jadi satu
  console.log(`📝 Tahap 2: Menggabungkan semua ringkasan`);
  const finalSummary = await combineSummaries(individualSummaries, llm);

  console.log(`${"=".repeat(60)}`);
  console.log(`🎉 Proses summarization selesai!`);
  console.log(`${"=".repeat(60)}\n`);

  return {
    individualSummaries,
    finalSummary,
  };
}
