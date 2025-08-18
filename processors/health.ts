import * as path from "path";
import { BaseProcessor } from "./base";
import { DailyMetrics, WeeklyMetrics } from "../types";
import {
  HealthRecord,
  HealthRecordParser,
  SleepAnalysisParser,
  StepCountParser,
  BodyMetricsParser,
} from "./parsers/health-parsers";
import {
  MetricProcessor,
  BodyCompositionProcessor,
  GenericQuantityProcessor,
  SleepMetricsProcessor,
  DerivedMetricsProcessor,
} from "./strategies/metric-strategies";
import {
  calculateHeight,
  calculateFFMI,
  calculateBCI,
  calculateAverageHeartRate,
  calculateTotalSteps,
} from "./utils/health-calculations";
import { calculateHealthSummary } from "./utils/health-summary";

export class HealthProcessor extends BaseProcessor {
  private parsers: HealthRecordParser[];
  private metricProcessors: MetricProcessor[];

  constructor() {
    super();
    this.parsers = this.initializeParsers();
    this.metricProcessors = this.initializeMetricProcessors();
  }

  private initializeParsers(): HealthRecordParser[] {
    return [
      new SleepAnalysisParser(
        (dateString: string) => this.extractDate(dateString),
        (value: number) => this.roundToTwoDecimals(value),
      ),
      new StepCountParser(
        (dateString: string) => this.extractDate(dateString),
        (value: number) => this.roundToTwoDecimals(value),
      ),
      new BodyMetricsParser(
        (dateString: string) => this.extractDate(dateString),
        (value: number) => this.roundToTwoDecimals(value),
      ),
    ];
  }

  private initializeMetricProcessors(): MetricProcessor[] {
    return [
      new BodyCompositionProcessor(),
      new GenericQuantityProcessor(
        "HKQuantityTypeIdentifierHeartRate",
        "HeartRate",
        (data) =>
          calculateAverageHeartRate(data, this.roundToTwoDecimals.bind(this)),
      ),
      new GenericQuantityProcessor(
        "HKQuantityTypeIdentifierStepCount",
        "StepCount",
        calculateTotalSteps,
      ),
      new SleepMetricsProcessor(),
      new DerivedMetricsProcessor(
        calculateHeight,
        calculateFFMI,
        calculateBCI,
        this.roundToTwoDecimals.bind(this),
      ),
    ];
  }

  private parseCSVRecord(fields: string[]): HealthRecord | null {
    if (fields.length < 8) return null;

    const type = fields[0];
    const sourceName = fields[1];

    for (const parser of this.parsers) {
      if (parser.canParse(type, sourceName)) {
        return parser.parse(fields);
      }
    }

    return null;
  }

  private groupDataByDateAndType(
    data: HealthRecord[],
  ): Record<string, Record<string, HealthRecord[]>> {
    const groupedByDate: Record<string, Record<string, HealthRecord[]>> = {};

    for (const record of data) {
      const date = record.date;
      const type = record.type;

      if (!groupedByDate[date]) {
        groupedByDate[date] = {};
      }

      if (!groupedByDate[date][type]) {
        groupedByDate[date][type] = [];
      }

      groupedByDate[date][type].push(record);
    }

    return groupedByDate;
  }

  private findHealthDataFiles(): string[] {
    return this.findFilesByExtension(".csv", "HK");
  }

  /**
   * Read and parse CSV file from "Health Export CSV" app
   * @param filePath - Path to the CSV file
   * @returns Parsed data records
   */
  private parseHKCSV(filePath: string): HealthRecord[] {
    const content = this.loadTextFile(filePath);
    const lines = content.split("\n");
    const dataLines = lines.slice(2); // Skip sep=, and header
    const data: HealthRecord[] = [];

    for (const line of dataLines) {
      if (line.trim() === "") continue;

      const fields = this.parseCSVLine(line);
      const record = this.parseCSVRecord(fields);

      if (record) {
        data.push(record);
      }
    }

    return data;
  }

  /**
   * Load and parse all health data files
   * @returns All parsed health data records
   */
  private loadHealthData(): HealthRecord[] {
    try {
      const csvFiles = this.findHealthDataFiles();
      const allData: HealthRecord[] = [];

      for (const filePath of csvFiles) {
        const fileName = path.basename(filePath);
        console.log(`Reading file: ${fileName}`);

        try {
          const fileData = this.parseHKCSV(filePath);
          allData.push(...fileData);
        } catch (error) {
          console.error(
            `Error reading file ${fileName}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      return allData;
    } catch (error) {
      throw new Error(
        `Failed to load health data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Combine health data by date
   * @param data - Array of health data records
   * @returns Combined data as array of daily metrics
   */
  private createDailyMetrics(data: HealthRecord[]): DailyMetrics[] {
    const groupedData = this.groupDataByDateAndType(data);
    const combined: Record<string, DailyMetrics> = {};

    for (const processor of this.metricProcessors) {
      processor.processMetrics(groupedData, combined);
    }

    return Object.values(combined);
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
      const allData = this.loadHealthData();
      console.log(`Total records read: ${allData.length}`);

      console.log("Processing health data...");
      const dailyMetrics = this.createDailyMetrics(allData);

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
