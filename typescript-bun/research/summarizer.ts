import { readFileSync, writeFileSync } from "fs"
import path from "path"
import yaml from "yaml"
import { ChatOpenAI } from "@langchain/openai"
import { fileURLToPath } from "url"
import { createAgent, tool} from "langchain";
import { z } from "zod"
import { lookupGlossary } from "./glossary.js";

const prompt = "ringkasan_notuly_v1"
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load file
const transcript = readFileSync(path.join(__dirname, "transcript.txt"), "utf-8")
const promptYaml = yaml.parse(readFileSync(path.join(__dirname, "prompts.yaml"), "utf-8"))
const systemPrompt = promptYaml[prompt]

// Init LLM
const model = new ChatOpenAI({
  model: process.env.MODEL,
  apiKey: process.env.GROQ_API_KEY,
  configuration: { baseURL: "https://api.groq.com/openai/v1" },
})

const glossaryTool = tool(
  async ({ term }) => {
    // Adjust this logic if lookupGlossary expects a different argument structure
    return lookupGlossary(term);
  },
  {
    name: "lookupGlossary",
    description: "Tools untuk mencari istilah dan mengembalikan definisinya.",
    schema: z.object({
      term: z.string().describe("Istilah-istilah yang bisa digunakan"),
    }),
  }
);

const agent = createAgent({
  model,
  tools: [glossaryTool],
  systemPrompt: "ok",
});

const res = await agent.invoke({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: transcript },
  ],
});

// Ambil hanya value dari AIMessage (id: AIMessage) jika ada, baik dari object langsung atau dari JSON string
function extractAIMessageContent(obj: any): string | undefined {
  // Cek apakah ada messages array
  if (obj && typeof obj === "object" && Array.isArray(obj.messages)) {
    // Cari AIMessage - bisa dicek dari id array atau dari type property
    const aiMsg = obj.messages.find(
      (msg: any) => {
        // Cek id array contains "AIMessage" atau type === "ai"
        const hasAIMessageId = Array.isArray(msg.id) && msg.id.some((item: any) => item === "AIMessage");
        const isAIType = msg.kwargs?.type === "ai" || msg.type === "ai";
        const hasContent = typeof msg.kwargs?.content === "string" || typeof msg.content === "string";
        return (hasAIMessageId || isAIType) && hasContent;
      }
    );
    if (aiMsg) return aiMsg.kwargs?.content || aiMsg.content;
  }

  // Cek kalau response langsung dari agent (bukan wrapped dalam messages)
  if (obj && typeof obj === "object" && typeof obj.content === "string") {
    return obj.content;
  }

  return undefined;
}

let summary = "";
if (typeof res === "string") {
  // Coba parse jika string JSON
  try {
    const parsed = JSON.parse(res);
    summary = extractAIMessageContent(parsed) ?? res;
  } catch {
    summary = res;
  }
} else {
  const extracted = extractAIMessageContent(res);
  if (extracted) {
    summary = extracted;
  } else {
    // Jika gagal ekstrak, fallback ke string kosong dan log error
    console.error("⚠️  Gagal mengekstrak AIMessage content dari response");
    summary = "[ERROR: Tidak bisa mengekstrak content dari response AI]";
  }
}

// Simpan hasil ke file dengan nama dinamis (promptName + YYYYMMDD-HHmmss)
const now = new Date();
const pad = (n: number) => n.toString().padStart(2, "0");
const fileDate = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
// Gunakan nama variabel prompt sebagai slug
const promptSlug = prompt.replace(/[^\w\d]+/g, "_").replace(/^_+|_+$/g, "");
const outPath = path.join(__dirname, `summary_${promptSlug}_${fileDate}.txt`);
writeFileSync(outPath, summary, "utf-8");
console.log(`\n==== RINGKASAN HASIL ====`);
console.log(summary);
console.log(`\n📄 Ringkasan disimpan ke: ${outPath}`);
