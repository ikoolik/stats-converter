import * as fs from "fs";
import { ParserUtils } from "./parsers/base";

export interface CSVRecord {
  type: string;
  sourceName: string;
  fields: string[];
}

/**
 * Simple CSV reader for Health Export CSV files
 * Handles the specific format used by Health Export CSV app
 */
export class CSVReader {
  static readHealthCSV(filePath: string): CSVRecord[] {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const dataLines = lines.slice(2); // Skip sep=, and header
    const records: CSVRecord[] = [];

    for (const line of dataLines) {
      if (line.trim() === "") continue;

      const fields = ParserUtils.parseCSVLine(line);
      if (fields.length < 8) continue;

      records.push({
        type: fields[0],
        sourceName: fields[1],
        fields,
      });
    }

    return records;
  }
}
