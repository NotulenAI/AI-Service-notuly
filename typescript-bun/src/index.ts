import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { apiReference } from "@scalar/hono-api-reference";
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Document } from "@langchain/core/documents";
import { processChunkSummarization, processFileChunkSummarization } from "./router/summarizer_chunk.js";
import { openApiSpec } from "./openapi.js";
import yaml from "js-yaml";
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(process.env.DATABASE_URL!);

const app = new Hono()

const prompt = new PromptTemplate({
  inputVariables: ["context"],
  template: "Ringkaskanlah transcript yang kumiliki ini {context}",
});

// ================================MODEL================================
// const llm_openai = new OpenAI({
//   baseURL: process.env.RUNPOD_BASE_URL!,
//   apiKey: process.env.RUNPOD_API_KEY!
// });

const llm = new ChatOpenAI({
  model: process.env.MODEL!,
  apiKey: process.env.RUNPOD_API_KEY!,
  configuration: {
    baseURL: process.env.RUNPOD_BASE_URL!,
  },
});

// =================================DOC=================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const transcriptText: string = readFileSync(path.join(__dirname, "transcript-yt.txt"), "utf-8");
const transcript = [new Document({ pageContent: transcriptText })];

// ============================DOC_ADVANCED============================

// ===============================ROUTER===============================
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/openapi.json', (c) => c.json(openApiSpec));

app.get(
  '/reference',
  apiReference({
    spec: {
      content: openApiSpec,
    },
    theme: 'saturn',
    layout: 'modern',
  }),
);

// testing vllm
// app.post('/vllm_openai', async (c) => {
//   const { input } = await c.req.json();

//   const response = await llm_openai.chat.completions.create({
//     model: "openai/gpt-oss-20b",
//     messages: [{ role: "user", content: input }],
//   });

//   return c.text(response.choices[0]?.message?.content ?? "");
// });

// summarize - menerima file txt input
app.post('/summaries', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    
    if (!file) {
      return c.json({ error: 'File txt tidak ditemukan' }, 400);
    }

    const textContent = await file.text();
    const documents = [new Document({ pageContent: textContent })];
    
    const chain = await createStuffDocumentsChain({
      llm: llm,
      outputParser: new StringOutputParser(),
      prompt,
    });
    
    const response = await chain.invoke({ context: documents });
    
    return c.json({
      success: true,
      summary: String(response),
      originalLength: textContent.length,
      summaryLength: String(response).length
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// summarize with langgraph
// app.get('/vllm_langgraph', async (c) => {
//   let finalSummary = null;

//   for await (const step of await langgraph.stream(
//     { contents: texts },
//     { recursionLimit: 10 }
//   )) {
//     console.log(Object.keys(step));
//     if (step.hasOwnProperty("generateFinalSummary")) {
//       finalSummary = step.generateFinalSummary;
//     }
//   }

//   return c.json(finalSummary);
// });

// RAG endpoint - hanya butuh input message
app.post('/rag', async (c) => {
  try {
    const { message } = await c.req.json();
    
    if (!message) {
      return c.json({ error: 'Message tidak boleh kosong' }, 400);
    }

    // Import dan jalankan RAG logic dari router/rag.ts
    const { processRAGQuery } = await import('./router/rag.js');
    const response = await processRAGQuery(message);

    return c.json({
      success: true,
      query: message,
      answer: response
    });
  } catch (error) {
    console.error("Error in rag:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// summarize chunks with parallelization - menerima file txt input
app.post('/summaries-chunk', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    
    if (!file) {
      return c.json({ error: 'File txt tidak ditemukan' }, 400);
    }

    const textContent = await file.text();
    
    // Split text into chunks (misal 2000 karakter per chunk)
    const chunkSize = 2000;
    const chunks: string[] = [];
    for (let i = 0; i < textContent.length; i += chunkSize) {
      chunks.push(textContent.slice(i, i + chunkSize));
    }

    // Process chunks dengan cara mirip processChunkSummarization tapi dengan chunks dari file
    const result = await processFileChunkSummarization(chunks, llm);

    return c.json({
      success: true,
      totalChunks: result.individualSummaries.length,
      individualSummaries: result.individualSummaries,
      finalSummary: result.finalSummary,
      originalLength: textContent.length
    });
  } catch (error) {
    console.error("Error in summaries-chunk:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

app.get('/summarized', async (c) => {
  try {
    console.log("\n🚀 Memulai summarization transcript.txt...");

    // Baca file transcript.txt
    const transcriptPath = path.join(__dirname, "transcript.txt");
    const transcriptContent = readFileSync(transcriptPath, "utf-8");
    console.log(`📄 Berhasil membaca transcript.txt (${transcriptContent.length} karakter)`);

    // Baca prompts dari prompts.yaml
    const promptsPath = path.join(__dirname, "prompts.yaml");
    const promptsYaml = readFileSync(promptsPath, "utf-8");
    const prompts = yaml.load(promptsYaml) as { instruction_based_summarizer_v1: string };
    const systemPrompt = prompts.instruction_based_summarizer_v1;
    console.log("📋 Berhasil memuat prompt instruction_based_summarizer_v1 dari prompts.yaml");

    // Setup LLM
    const llm_groq = new ChatOpenAI({
      model: process.env.MODEL,
      apiKey: process.env.GROQ_API_KEY,
      configuration: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    });

    // Proses summarization dengan LLM
    console.log("🤖 Memproses summarization dengan LLM...");
    const aiMsg = await llm_groq.invoke([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: transcriptContent
      },
    ]);

    // Ekstrak content dari response
    const summaryContent = typeof aiMsg.content === 'string'
      ? aiMsg.content
      : Array.isArray(aiMsg.content)
        ? aiMsg.content.map(c => typeof c === 'string' ? c : c.text || '').join('')
        : String(aiMsg.content);

    console.log(`✅ Summarization selesai (${summaryContent.length} karakter)`);

    // Simpan hasil summary ke file
    const outputPath = path.join(__dirname, "transcript_summary.txt");
    writeFileSync(outputPath, summaryContent, "utf-8");
    console.log(`💾 Summary berhasil disimpan ke: ${outputPath}`);

    // Tampilkan summary di terminal
    console.log("\n" + "=".repeat(80));
    console.log("📝 HASIL SUMMARY:");
    console.log("=".repeat(80));
    console.log(summaryContent);
    console.log("=".repeat(80) + "\n");

    return c.json({
      success: true,
      summary: summaryContent,
      savedTo: outputPath,
      originalLength: transcriptContent.length,
      summaryLength: summaryContent.length
    });
  } catch (error) {
    console.error("❌ Error in summarized:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})