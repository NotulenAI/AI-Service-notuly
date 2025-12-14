import { initChatModel, modelCallLimitMiddleware, Document } from "langchain";
import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { collapseDocs, splitListOfDocs } from "@langchain/classic/chains/combine_documents/reduce";
import { pull } from "langchain/hub";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve directory of this file and read transcript from repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const transcriptPath = path.join(__dirname, "..", "transcript-yt.txt");
const transcriptText: string = fs.readFileSync(transcriptPath, "utf-8");
const transcript = [new Document({ pageContent: transcriptText })];

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,
});

const texts = await textSplitter.splitText(transcriptText);

let tokenMax = 1000;

// Initialize a chat model. Adjust model name/options to your environment if needed.
// initChatModel returns a promise, so await it. The API may accept the model
// name as the first argument.
const llm = await initChatModel("gpt-4o-mini");

async function lengthFunction(documents: any) {
  // Some LLM wrappers expose `getNumTokens`; fall back to a simple heuristic
  const tokenCounts = await Promise.all(
    documents.map(async (doc: any) => {
      const content = doc?.pageContent ?? "";
      if (typeof llm?.getNumTokens === "function") {
        try {
          return await llm.getNumTokens(content);
        } catch (e) {
          // fall through to heuristic
        }
      }
      // Rough heuristic: average 4 characters per token
      return Math.max(1, Math.ceil(content.length / 4));
    })
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

// Pull prompts from LangChain Hub
const mapPrompt = await pull<ChatPromptTemplate>("rlm/map-prompt");
const reducePrompt = await pull<ChatPromptTemplate>("rlm/reduce-prompt");

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
  const promptResult = await mapPrompt.invoke({ context: state.content });
  const response = await llm.invoke(promptResult);
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
  const promptResult = await reducePrompt.invoke({ docs: input });
  const response = await llm.invoke(promptResult);
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

export default langgraph;
