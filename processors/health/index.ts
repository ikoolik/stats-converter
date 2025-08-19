import * as path from "path";
import { BaseProcessor } from "../base";
import { DailyMetrics, WeeklyMetrics } from "../../types";
import { FileParser } from "./parsers/file-parser";
import { HealthCSVParser } from "./parsers/health-csv-parser";
import { MetricsMerger } from "./parsers/metrics-merger";
import { calculateHealthSummary } from "./summary";

export class HealthProcessor extends BaseProcessor {
  private readonly fileParsers: FileParser[];

  constructor() {
    super();
    this.fileParsers = this.initializeFileParsers();
  }

  private initializeFileParsers(): FileParser[] {
    return [
      new HealthCSVParser(),
      // Future parsers can be added here (e.g., JSON, XML, other CSV formats)
    ];
  }

  /**
   * Get all supported filenames from all parsers
   * @returns Array of file paths to process
   */
  private getSupportedFiles(): string[] {
    const allFiles: string[] = [];

    for (const parser of this.fileParsers) {
      const supportedFiles = parser.getSupportedFiles(this.sourcesDir);
      allFiles.push(...supportedFiles);
    }

    return allFiles;
  }

  /**
   * Process all supported files using dedicated parsers to get DailyMetrics
   * @returns Array of DailyMetrics arrays from different parsers
   */
  private processAllFiles(): DailyMetrics[][] {
    const metricsSets: DailyMetrics[][] = [];

    for (const parser of this.fileParsers) {
      console.log(`Processing files with ${parser.getName()} parser...`);
      const supportedFiles = parser.getSupportedFiles(this.sourcesDir);

      if (supportedFiles.length === 0) {
        console.log(`No supported files found for ${parser.getName()} parser`);
        continue;
      }

      const parserMetrics: DailyMetrics[] = [];

      for (const filePath of supportedFiles) {
        const fileName = path.basename(filePath);
        console.log(`  Reading file: ${fileName}`);

        try {
          const fileMetrics = parser.parseFile(filePath);
          parserMetrics.push(...fileMetrics);
        } catch (error) {
          console.error(
            `  Error reading file ${fileName}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      if (parserMetrics.length > 0) {
        metricsSets.push(parserMetrics);
        console.log(
          `${parser.getName()} parser processed ${parserMetrics.length} daily metrics`,
        );
      }
    }

    return metricsSets;
  }

  /**
   * Create summary for health data
   * @param dailyMetrics - Array of daily metrics
   * @returns Summary object with averaged metrics
   */
  protected createSummary(
    dailyMetrics: DailyMetrics[],
  ): string | Record<string, unknown> {
    return calculateHealthSummary(dailyMetrics);
  }

  /**
   * Main processing method
   */
  public process(): WeeklyMetrics[] {
    try {
      console.log("Loading health data...");

      // 1. Get all supported filenames from parsers
      const supportedFiles = this.getSupportedFiles();
      console.log(`Found ${supportedFiles.length} supported files`);

      // 2. Process each file with dedicated parsers to get DailyMetrics
      const metricsSets = this.processAllFiles();
      console.log(
        `Processed data with ${metricsSets.length} different parsers`,
      );

      // 3. Flat merge DailyMetrics from different parsers
      console.log("Merging daily metrics from all parsers...");
      const unifiedDailyMetrics = MetricsMerger.flatMerge(metricsSets);
      console.log(`Unified ${unifiedDailyMetrics.length} daily metrics`);

      // 4. Pass unified DailyMetrics to createWeeklyMetrics
      console.log("Grouping by week...");
      const weeklyMetrics = this.createWeeklyMetrics(unifiedDailyMetrics);

      console.log("Saving weekly files...");
      this.saveWeeklyFiles(weeklyMetrics, "health");

      console.log("Health processing completed successfully!");
      return weeklyMetrics;
    } catch (error) {
      console.error(
        "Error processing health data:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
