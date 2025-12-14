/**
 * Map-Reduce Summarization using Vercel AI SDK
 *
 * Workflow:
 * 1. Map: Generate summaries for each content chunk in parallel
 * 2. Collect: Gather all summaries
 * 3. Collapse: If summaries exceed token limit, reduce them
 * 4. Repeat collapse until under token limit
 * 5. Generate final summary
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Configuration
const TOKEN_MAX = 1000;

// Initialize LLM provider
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = openai('gpt-4-turbo');

// Types
interface Document {
  content: string;
  metadata?: Record<string, any>;
}

interface OverallState {
  contents: string[];
  summaries: string[];
  collapsedSummaries: Document[];
  finalSummary?: string;
}

// Utility: Rough token estimation (~4 chars per token)
function getTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function lengthFunction(documents: Document[]): number {
  return documents.reduce((sum, doc) => sum + getTokenCount(doc.content), 0);
}

// Prompts
const MAP_PROMPT = (content: string) => `
Please provide a concise summary of the following text:

${content}

Summary:`;

const REDUCE_PROMPT = (summaries: string) => `
Please combine and synthesize the following summaries into a single coherent summary:

${summaries}

Combined Summary:`;

// Node Functions
async function generateSummary(content: string): Promise<string> {
  const { text } = await generateText({
    model,
    prompt: MAP_PROMPT(content),
    temperature: 0.3,
  });

  return text;
}

async function mapSummaries(contents: string[]): Promise<string[]> {
  const summaryPromises = contents.map(content => generateSummary(content));
  return Promise.all(summaryPromises);
}

function collectSummaries(summaries: string[]): Document[] {
  return summaries.map(summary => ({ content: summary }));
}

async function reduce(documents: Document[]): Promise<string> {
  const combinedText = documents.map(doc => doc.content).join('\n\n---\n\n');

  const { text } = await generateText({
    model,
    prompt: REDUCE_PROMPT(combinedText),
    temperature: 0.3,
  });

  return text;
}

function splitDocumentsByTokens(documents: Document[], maxTokens: number): Document[][] {
  const batches: Document[][] = [];
  let currentBatch: Document[] = [];
  let currentTokens = 0;

  for (const doc of documents) {
    const docTokens = getTokenCount(doc.content);

    if (currentTokens + docTokens > maxTokens && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [doc];
      currentTokens = docTokens;
    } else {
      currentBatch.push(doc);
      currentTokens += docTokens;
    }
  }

  if (currentBatch.length > 0) batches.push(currentBatch);

  return batches;
}

async function collapseSummaries(documents: Document[]): Promise<Document[]> {
  const docLists = splitDocumentsByTokens(documents, TOKEN_MAX);

  const results = await Promise.all(
    docLists.map(async docList => {
      const collapsed = await reduce(docList);
      return { content: collapsed };
    })
  );

  return results;
}

function shouldCollapse(documents: Document[]): boolean {
  return lengthFunction(documents) > TOKEN_MAX;
}

async function generateFinalSummary(documents: Document[]): Promise<string> {
  return reduce(documents);
}

// Main workflow
export async function summarizeDocuments(contents: string[]): Promise<string> {
  console.log('Starting map-reduce summarization...');
  console.log(`Processing ${contents.length} content chunks\n`);

  // Step 1: Map - Generate summaries for each chunk
  console.log('Step 1: Generating summaries for each chunk...');
  const summaries = await mapSummaries(contents);
  console.log(`Generated ${summaries.length} summaries\n`);

  // Step 2: Collect summaries
  console.log('Step 2: Collecting summaries...');
  let collapsedSummaries = collectSummaries(summaries);
  console.log(`Collected ${collapsedSummaries.length} summaries`);
  console.log(`Total tokens: ${lengthFunction(collapsedSummaries)}\n`);

  // Step 3: Collapse summaries if needed (iterative)
  let iteration = 1;
  while (shouldCollapse(collapsedSummaries)) {
    console.log(`Step 3.${iteration}: Collapsing summaries (tokens > ${TOKEN_MAX})...`);
    collapsedSummaries = await collapseSummaries(collapsedSummaries);
    console.log(`Collapsed to ${collapsedSummaries.length} summaries`);
    console.log(`Total tokens: ${lengthFunction(collapsedSummaries)}\n`);
    iteration++;
  }

  // Step 4: Generate final summary
  console.log('Step 4: Generating final summary...');
  const finalSummary = await generateFinalSummary(collapsedSummaries);
  console.log('Final summary generated!\n');

  return finalSummary;
}

// Example usage
export async function example() {
  const sampleContents = [
    'First chunk of content to summarize...',
    'Second chunk of content to summarize...',
    'Third chunk of content to summarize...',
  ];

  const finalSummary = await summarizeDocuments(sampleContents);

  console.log('=== FINAL SUMMARY ===');
  console.log(finalSummary);

  return finalSummary;
}

// Uncomment to run example
// example().catch(console.error);
