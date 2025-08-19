import * as path from "path";
import * as fs from "fs";
import { DailyMetrics } from "../../../types";
import { FileParser } from "./file-parser";
import { ParserUtils } from "./parser-utils";
import { HealthRecord, HealthRecordParser } from "./base";
import { SleepAnalysisParser } from "./sleep-analysis";
import { StepCountParser } from "./step-count";
import { BodyMetricsParser } from "./body-metrics";
import {
  MetricProcessor,
  BodyCompositionProcessor,
  GenericQuantityProcessor,
  SleepMetricsProcessor,
  DerivedMetricsProcessor,
} from "../strategies";
import {
  calculateHeight,
  calculateFFMI,
  calculateBCI,
  calculateAverageHeartRate,
  calculateTotalSteps,
} from "../calculations";

/**
 * Parser for Health Export CSV files (HK*.csv)
 */
export class HealthCSVParser implements FileParser {
  private readonly recordParsers: HealthRecordParser[];
  private readonly metricProcessors: MetricProcessor[];

  constructor() {
    this.recordParsers = this.initializeRecordParsers();
    this.metricProcessors = this.initializeMetricProcessors();
  }

  private initializeRecordParsers(): HealthRecordParser[] {
    return [
      new SleepAnalysisParser(
        ParserUtils.extractDate,
        ParserUtils.roundToTwoDecimals,
      ),
      new StepCountParser(
        ParserUtils.extractDate,
        ParserUtils.roundToTwoDecimals,
      ),
      new BodyMetricsParser(
        ParserUtils.extractDate,
        ParserUtils.roundToTwoDecimals,
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
          calculateAverageHeartRate(data, ParserUtils.roundToTwoDecimals),
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
        ParserUtils.roundToTwoDecimals,
      ),
    ];
  }

  getName(): string {
    return "HealthCSV";
  }

  getSupportedFiles(sourceDirectory: string): string[] {
    try {
      const files = fs.readdirSync(sourceDirectory);
      const supportedFiles = files
        .filter((file) => file.startsWith("HK") && file.endsWith(".csv"))
        .map((file) => path.join(sourceDirectory, file));

      if (supportedFiles.length === 0) {
        console.warn(`No HK*.csv files found in ${sourceDirectory}`);
        console.warn(
          `Expected files: HKBodyMass.csv, HKSleepAnalysis.csv, etc.`,
        );
      }

      return supportedFiles;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error accessing source directory ${sourceDirectory}: ${errorMessage}`,
      );

      if (error instanceof Error && "code" in error) {
        const fsError = error as Error & { code: string };
        switch (fsError.code) {
          case "ENOENT":
            console.error(`Directory does not exist: ${sourceDirectory}`);
            break;
          case "EACCES":
            console.error(
              `Permission denied accessing directory: ${sourceDirectory}`,
            );
            break;
          default:
            console.error(`Filesystem error code: ${fsError.code}`);
        }
      }

      return [];
    }
  }

  parseFile(filePath: string): DailyMetrics[] {
    try {
      const healthRecords = this.parseHKCSV(filePath);
      return this.convertToDailyMetrics(healthRecords);
    } catch (error) {
      const fileName = path.basename(filePath);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(`Error parsing file ${fileName}: ${errorMessage}`);
      console.error(`File path: ${filePath}`);

      // Return empty array but with more detailed logging for debugging
      console.warn(
        `Skipping file ${fileName} due to parsing error. This may indicate:`,
      );
      console.warn(`- Corrupted or invalid CSV format`);
      console.warn(`- Unexpected data structure in health export`);
      console.warn(`- File encoding issues`);

      return [];
    }
  }

  private parseHKCSV(filePath: string): HealthRecord[] {
    const content = ParserUtils.loadTextFile(filePath);
    const lines = content.split("\n");
    const dataLines = lines.slice(2); // Skip sep=, and header
    const data: HealthRecord[] = [];

    for (const line of dataLines) {
      if (line.trim() === "") continue;

      const fields = ParserUtils.parseCSVLine(line);
      const record = this.parseCSVRecord(fields);

      if (record) {
        data.push(record);
      }
    }

    return data;
  }

  private parseCSVRecord(fields: string[]): HealthRecord | null {
    if (fields.length < 8) return null;

    const type = fields[0];
    const sourceName = fields[1];

    for (const parser of this.recordParsers) {
      if (parser.canParse(type, sourceName)) {
        return parser.parse(fields);
      }
    }

    return null;
  }

  private convertToDailyMetrics(records: HealthRecord[]): DailyMetrics[] {
    const groupedData = this.groupDataByDateAndType(records);
    const combined: Record<string, DailyMetrics> = {};

    for (const processor of this.metricProcessors) {
      processor.processMetrics(groupedData, combined);
    }

    return Object.values(combined);
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
}
