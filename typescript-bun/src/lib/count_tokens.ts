import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";
import fs from "fs/promises";

const enc = new Tiktoken(o200k_base);

async function countTokens(filePath: string): Promise<number> {
  const text = await fs.readFile(new URL(filePath, import.meta.url), "utf8");
  const tokens = enc.encode(text);
  return tokens.length;
}

async function main() {
  const tokenCount = await countTokens("../data/1 GUNDAM ZAKU TERBUKA = 1 WEJANGAN HIDUP DARI RADITYA DIKA!.txt");
  console.log(`${tokenCount} tokens`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});