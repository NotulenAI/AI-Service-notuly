import { Hono } from 'hono'
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { Document } from "@langchain/core/documents";
import { initChatModel } from "langchain";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";

const app = new Hono()

const prompt = new PromptTemplate({
  inputVariables: ["context"],
  template: "Ringkaskanlah transcript yang kumiliki ini {context}",
});

// ================================MODEL================================
const llm_openai = new OpenAI({ baseURL: process.env.RUNPOD_BASE_URL!,
  apiKey: process.env.RUNPOD_API_KEY! });

// const llm = new ChatGroq({
//   model: "llama-3.3-70b-versatile",
//   temperature: 0
// });

// const llm = initChatModel(
//     process.env.RUNPOD_MODEL,
//     {
//         modelProvider: "openai",
//         baseUrl: process.env.RUNNPOD_BASE_URL!,
//         apiKey: process.env.RUNPOD_API_KEY!,
//     }
// )

const llm = new ChatOpenAI({
  model: process.env.RUNPOD_MODEL,
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
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,
});

const texts = await textSplitter.splitText(transcriptText);

let tokenMax = 1000;

async function lengthFunction(documents: any) {
  const tokenCounts = await Promise.all(
    documents.map(async (doc: any) => {
      return llm.getNumTokens(doc.pageContent);
    })
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}
const OverallState = Annotation.Root({
  contents: Annotation<string[]>,
  // Notice here we pass a reducer function.
  // This is because we want combine all the summaries we generate
  // from individual nodes back into one list. - this is essentially
  // the "reduce" part
  summaries: Annotation<string[]>({
    reducer: (state, update) => state.concat(update),
  }),
  collapsedSummaries: Annotation<Document[]>,
  finalSummary: Annotation<string>,
});

// This will be the state of the node that we will "map" all
// documents to in order to generate summaries
interface SummaryState {
  content: string;
}

// Here we generate a summary, given a document
const generateSummary = async (
  state: SummaryState
): Promise<{ summaries: string[] }> => {
  const prompt = await mapPrompt.invoke({ context: state.content });
  const response = await llm.invoke(prompt);
  return { summaries: [String(response.content)] };
};

// Here we define the logic to map out over the documents
// We will use this an edge in the graph
const mapSummaries = (state: typeof OverallState.State) => {
  // We will return a list of `Send` objects
  // Each `Send` object consists of the name of a node in the graph
  // as well as the state to send to that node
  return state.contents.map(
    (content) => new Send("generateSummary", { content })
  );
};

const collectSummaries = async (state: typeof OverallState.State) => {
  return {
    collapsedSummaries: state.summaries.map(
      (summary) => new Document({ pageContent: summary })
    ),
  };
};

async function _reduce(input) {
  const prompt = await reducePrompt.invoke({ docs: input });
  const response = await llm.invoke(prompt);
  return String(response.content);
}

// Add node to collapse summaries
const collapseSummaries = async (state: typeof OverallState.State) => {
  const docLists = splitListOfDocs(
    state.collapsedSummaries,
    lengthFunction,
    tokenMax
  );
  const results = [];
  for (const docList of docLists) {
    results.push(await collapseDocs(docList, _reduce));
  }

  return { collapsedSummaries: results };
};

// This represents a conditional edge in the graph that determines
// if we should collapse the summaries or not
async function shouldCollapse(state: typeof OverallState.State) {
  let numTokens = await lengthFunction(state.collapsedSummaries);
  if (numTokens > tokenMax) {
    return "collapseSummaries";
  } else {
    return "generateFinalSummary";
  }
}

// Here we will generate the final summary
const generateFinalSummary = async (state: typeof OverallState.State) => {
  const response = await _reduce(state.collapsedSummaries);
  return { finalSummary: response };
};

// Construct the graph
const graph = new StateGraph(OverallState)
  .addNode("generateSummary", generateSummary)
  .addNode("collectSummaries", collectSummaries)
  .addNode("collapseSummaries", collapseSummaries)
  .addNode("generateFinalSummary", generateFinalSummary)
  .addConditionalEdges("__start__", mapSummaries, ["generateSummary"])
  .addEdge("generateSummary", "collectSummaries")
  .addConditionalEdges("collectSummaries", shouldCollapse, [
    "collapseSummaries",
    "generateFinalSummary",
  ])
  .addConditionalEdges("collapseSummaries", shouldCollapse, [
    "collapseSummaries",
    "generateFinalSummary",
  ])
  .addEdge("generateFinalSummary", "__end__");

const langgraph = graph.compile();

// ===============================ROUTER===============================
app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// testing vllm
app.post('/vllm_openai', async (c) => {
  const { input } = await c.req.json();

  const response = await llm_openai.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: input }],
  });

  return c.text(response.choices[0]?.message?.content ?? "");
});

// summarize
app.get('/vllm_chatopenai', async (c) => {
  const chain = await createStuffDocumentsChain({
    llm: llm,
    outputParser: new StringOutputParser(),
    prompt,
  });
  const response = await chain.invoke({ context: transcript });
  return c.text(response);
  // return c.text(transcriptText);
});

export default app