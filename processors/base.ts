import * as fs from "fs";
import * as path from "path";
import { DailyMetrics, WeeklyMetrics } from "../types";

// Constants
const MILLISECONDS_PER_DAY = 86400000;
const DECIMAL_PRECISION = 100;
const ISO_WEEK_BASE = 4;
const ISO_WEEK_DIVISOR = 7;
const WEEK_PADDING_LENGTH = 2;

/**
 * Base class for all data processors
 * Provides common infrastructure and utility methods
 */
export class BaseProcessor {
  protected sourcesDir: string;
  protected resultsDir: string;

  constructor() {
    // When compiled, __dirname points to dist/processors, so we need to go up two levels
    const baseDir = path.join(__dirname, "..", "..");
    this.sourcesDir = path.join(baseDir, "sources");
    this.resultsDir = path.join(baseDir, "results");
  }

  /**
   * Ensure the results directory exists
   */
  protected ensureResultsDir(): void {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir);
    }
  }

  /**
   * Extract date from timestamp (ignoring time)
   * @param timestamp - The timestamp string
   * @returns The date in YYYY-MM-DD format
   */
  protected extractDate(timestamp: string): string {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${timestamp}`);
    }
    return date.toISOString().split("T")[0];
  }

  /**
   * Round values to two decimal places
   * @param value - The value to round
   * @returns The rounded value
   */
  protected roundToTwoDecimals(value: number): number {
    return Math.round(value * DECIMAL_PRECISION) / DECIMAL_PRECISION;
  }

  /**
   * Get ISO week number for a date
   * @param date - The date to get week number for
   * @returns The week number
   */
  protected getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || ISO_WEEK_DIVISOR;
    d.setUTCDate(d.getUTCDate() + ISO_WEEK_BASE - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(
      ((d.getTime() - yearStart.getTime()) / MILLISECONDS_PER_DAY + 1) /
        ISO_WEEK_DIVISOR,
    );
  }

  /**
   * Parse CSV line with proper handling of quoted fields
   * @param line - CSV line to parse
   * @returns Array of field values
   */
  protected parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim());

    return fields;
  }

  /**
   * Group daily metrics by week
   * @param dailyMetrics - Array of daily metrics
   * @returns Array of weekly metrics
   */
  protected createWeeklyMetrics(dailyMetrics: DailyMetrics[]): WeeklyMetrics[] {
    const weeklyData: Record<string, DailyMetrics[]> = {};

    const sortedData = dailyMetrics.sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    sortedData.forEach((record) => {
      const date = new Date(record.date);
      const year = date.getFullYear();
      const weekNumber = this.getWeekNumber(date);
      const weekKey = `${year}-week-${weekNumber.toString().padStart(WEEK_PADDING_LENGTH, "0")}`;

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }

      weeklyData[weekKey].push(record);
    });

    return Object.keys(weeklyData).map((weekKey) => ({
      week: weekKey,
      totalDays: weeklyData[weekKey].length,
      days: weeklyData[weekKey],
    }));
  }

  /**
   * Save weekly files
   * @param weeklyMetrics - Array of weekly metrics
   * @param suffix - File suffix (e.g., 'health', 'macros', 'training')
   */
  protected saveWeeklyFiles(
    weeklyMetrics: WeeklyMetrics[],
    suffix: string,
  ): void {
    this.ensureResultsDir();

    weeklyMetrics.forEach((weekResult) => {
      const outputFile = path.join(
        this.resultsDir,
        `${weekResult.week}-${suffix}.json`,
      );
      fs.writeFileSync(outputFile, JSON.stringify(weekResult, null, 2));
      console.log(
        `${suffix.charAt(0).toUpperCase() + suffix.slice(1)} results written to ${outputFile}`,
      );
    });
  }

  /**
   * Find files in sources directory by extension and optional prefix
   * @param extension - File extension to filter by (e.g., '.csv', '.gymtracker')
   * @param prefix - Optional prefix to filter by (e.g., 'HK')
   * @returns Array of file paths
   */
  protected findFilesByExtension(extension: string, prefix?: string): string[] {
    try {
      const files = fs.readdirSync(this.sourcesDir);
      let filteredFiles = files.filter((file) => file.endsWith(extension));

      if (prefix) {
        filteredFiles = filteredFiles.filter((file) => file.startsWith(prefix));
      }

      if (filteredFiles.length === 0) {
        const prefixText = prefix ? ` starting with '${prefix}'` : "";
        throw new Error(
          `No ${extension} files${prefixText} found in ${this.sourcesDir}`,
        );
      }

      return filteredFiles.map((file) => path.join(this.sourcesDir, file));
    } catch (error) {
      throw new Error(
        `Failed to find files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Path to the file to check
   * @returns True if file exists
   */
  protected checkFileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Load and parse a JSON file
   * @param filePath - Path to the JSON file
   * @returns Parsed JSON data
   */
  protected loadJSONFile<T>(filePath: string): T {
    try {
      if (!this.checkFileExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load JSON file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load and parse a text file
   * @param filePath - Path to the text file
   * @returns File content as string
   */
  protected loadTextFile(filePath: string): string {
    try {
      if (!this.checkFileExists(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      return fs.readFileSync(filePath, "utf8");
    } catch (error) {
      throw new Error(
        `Failed to load text file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
