import * as fs from "fs";
import { DailyMetrics } from "../../../types";

export interface CSVRecord {
  type: string;
  sourceName: string;
  fields: string[];
}

/**
 * Base class for file-type specific parsers
 * Each parser processes a specific type of health file (e.g., Steps, Sleep) into DailyMetrics
 */
export abstract class BaseFileParser {
  abstract parseFile(records: CSVRecord[]): DailyMetrics[];

  /**
   * Parse a CSV file by reading it and processing the records
   */
  parseCSVFile(filePath: string): DailyMetrics[] {
    const csvRecords = ParserUtils.readHealthCSV(filePath);
    return this.parseFile(csvRecords);
  }
}

/**
 * Utility functions for parsers to reduce dependency injection
 */
export class ParserUtils {
  /**
   * Extract ISO date from date string (YYYY-MM-DD format)
   */
  static extractDate(dateString: string): string {
    // Handle both space-separated and ISO format (with T)
    return dateString.split(/[T ]/)[0];
  }

  /**
   * Round value to two decimal places
   */
  static roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Read Health Export CSV files
   * Handles the specific format used by Health Export CSV app
   */
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

  /**
   * Parse CSV line with proper handling of quoted values
   */
  static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"' && (i === 0 || line[i - 1] === ",")) {
        inQuotes = true;
      } else if (char === '"' && inQuotes && line[i + 1] === ",") {
        inQuotes = false;
        i++; // Skip the comma
        result.push(current);
        current = "";
      } else if (char === '"' && inQuotes && i === line.length - 1) {
        inQuotes = false;
        result.push(current);
        current = "";
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }

      i++;
    }

    if (current) {
      result.push(current);
    }

    return result;
  }
}
