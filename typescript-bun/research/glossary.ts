import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

// Utility to resolve __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the Excel file (glosarium.xlsx)
const filePath = path.join(__dirname, "./glosarium.xlsx");
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert sheet to JSON (array of rows)
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

// Build dictionary: key = column A, value = column B
const glossary: Record<string, string> = {};
for (const row of rows) {
  if (Array.isArray(row) && row[0] && row[1]) {
    glossary[String(row[0]).trim()] = String(row[1]).trim();
  }
}

// Search function: support single or multiple keys
export function lookupGlossary(key: string): string | undefined;
export function lookupGlossary(keys: string[]): Record<string, string | undefined>;
export function lookupGlossary(keyOrKeys: string | string[]): string | undefined | Record<string, string | undefined> {
  // Helper: split comma-separated string into array, or pass array as is
  const toKeyArray = (input: string | string[]): string[] => {
    if (Array.isArray(input)) return input.flatMap(s => s.split(",")).map(s => s.trim()).filter(Boolean);
    return input.split(",").map(s => s.trim()).filter(Boolean);
  };
  if (Array.isArray(keyOrKeys) || (typeof keyOrKeys === "string" && keyOrKeys.includes(","))) {
    const keys = toKeyArray(keyOrKeys);
    const result: Record<string, string | undefined> = {};
    for (const k of keys) {
      result[k] = glossary[k];
    }
    return result;
  } else {
    return glossary[String(keyOrKeys).trim()];
  }
}

