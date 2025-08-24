import * as path from "path";
import * as fs from "fs";
import { BaseProcessor } from "../base";
import { DailyMetrics, WeeklyMetrics } from "../../types";
import { calculateHealthSummary } from "./summary";
import { MetricsMerger } from "./metrics-merger";
import {
  BaseFileParser,
  StepCountFileParser,
  SleepAnalysisFileParser,
  BodyMassFileParser,
  BodyFatFileParser,
  LeanBodyMassFileParser,
  BodyMassIndexFileParser,
  HeartRateFileParser,
} from "./parsers";

export class HealthProcessor extends BaseProcessor {
  private readonly parsersByPrefix: Record<string, BaseFileParser>;

  constructor() {
    super();
    this.parsersByPrefix = this.initializeParsers();
  }

  private initializeParsers(): Record<string, BaseFileParser> {
    return {
      HKQuantityTypeIdentifierStepCount: new StepCountFileParser(),
      HKCategoryTypeIdentifierSleepAnalysis: new SleepAnalysisFileParser(),
      HKQuantityTypeIdentifierBodyMass: new BodyMassFileParser(),
      HKQuantityTypeIdentifierBodyFatPercentage: new BodyFatFileParser(),
      HKQuantityTypeIdentifierLeanBodyMass: new LeanBodyMassFileParser(),
      HKQuantityTypeIdentifierBodyMassIndex: new BodyMassIndexFileParser(),
      HKQuantityTypeIdentifierHeartRate: new HeartRateFileParser(),
    };
  }

  /**
   * Get HK CSV files from sources directory
   * @returns Array of file paths to process
   */
  private getHKFiles(): string[] {
    try {
      const files = fs.readdirSync(this.sourcesDir);
      const supportedFiles = files
        .filter((file) => file.startsWith("HK") && file.endsWith(".csv"))
        .map((file) => path.join(this.sourcesDir, file));

      if (supportedFiles.length === 0) {
        console.warn(`No HK*.csv files found in ${this.sourcesDir}`);
      }

      return supportedFiles;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  /**
   * Process all supported files to get DailyMetrics
   * Uses filename-based parser selection and dedicated file parsers
   * @returns Array of DailyMetrics
   */
  private extractMetricsFromAllFiles(): DailyMetrics[] {
    const filesToProcess = this.getHKFiles();

    if (filesToProcess.length === 0) {
      console.log(`No supported health sources found`);
      return [];
    }

    const allMetricsArrays: DailyMetrics[][] = [];

    for (const filePath of filesToProcess) {
      const fileName = path.basename(filePath);
      const filePrefix = fileName.split("_")[0];

      console.log(`  Processing file: ${fileName} (type: ${filePrefix})`);

      try {
        // Find appropriate parser based on filename prefix
        const parser = this.parsersByPrefix[filePrefix];
        if (!parser) {
          console.warn(`    No parser found for file type: ${filePrefix}`);
          continue;
        }
        const fileMetrics = parser.parseCSVFile(filePath);
        if (fileMetrics.length > 0) {
          allMetricsArrays.push(fileMetrics);
          console.log(`    Processed ${fileMetrics.length} daily metrics`);
        } else {
          console.warn(`    No metrics extracted from file`);
        }
      } catch (error) {
        console.error(
          `  Error processing file ${fileName}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    // Merge all metrics from different files by date
    const mergedMetrics = MetricsMerger.merge(allMetricsArrays);

    console.log(
      `Processed ${filesToProcess.length} files, extracted ${mergedMetrics.length} daily metrics`,
    );

    return mergedMetrics;
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
      const dailyMetrics = this.extractMetricsFromAllFiles();
      console.log(`Processed ${dailyMetrics.length} daily metrics`);

      // 3. Group by week
      console.log("Grouping by week...");
      const weeklyMetrics = this.createWeeklyMetrics(dailyMetrics);

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
