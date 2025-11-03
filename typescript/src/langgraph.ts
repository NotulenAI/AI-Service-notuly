import {
  collapseDocs,
  splitListOfDocs,
} from "langchain/chains/combine_documents/reduce";
import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const transcriptText: string = readFileSync(path.join(__dirname, "transcript-yt.txt"), "utf-8");
const transcript = [new Document({ pageContent: transcriptText })];

const mapPrompt = (await pull) < ChatPromptTemplate > "rlm/map-prompt";

const llm = new ChatOpenAI({
  model: process.env.RUNPOD_MODEL,
  apiKey: process.env.RUNPOD_API_KEY!,
  configuration: {
    baseURL: process.env.RUNPOD_BASE_URL!,
  },
});

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

async function _reduce(input: any) {
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

let finalSummary = null;

// Document processing

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,
});

const texts = await textSplitter.splitText(transcriptText);

// const text2 = await textSplitter.splitDocuments(transcriptText);

for await (const step of await langgraph.stream(
  { contents: texts.map((doc) => doc.pageContent) },
  { recursionLimit: 10 }
)) {
  console.log(Object.keys(step));
  if (step.hasOwnProperty("generateFinalSummary")) {
    finalSummary = step.generateFinalSummary;
  }
}