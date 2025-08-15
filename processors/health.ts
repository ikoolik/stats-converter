import * as path from "path";
import { BaseProcessor } from "./base";
import { DailyMetrics, WeeklyMetrics } from "../types";

// Constants
const MILLISECONDS_PER_MINUTE = 60000;
const SLEEP_SESSION_GAP_THRESHOLD_MS =1800000;

interface HealthRecord {
  date: string;
  type: string;
  value: number | string;
  duration?: number;
  startDate?: string;
  endDate?: string;
  unit?: string;
}

interface SleepMetrics {
  Core: string;
  Deep: string;
  REM: string;
  Total: string;
  wakeUps: number;
}

abstract class HealthRecordParser {
  protected extractDate: (dateString: string) => string;
  protected roundToTwoDecimals: (value: number) => number;

  constructor(
    extractDateFn: (dateString: string) => string,
    roundFn: (value: number) => number,
  ) {
    this.extractDate = extractDateFn;
    this.roundToTwoDecimals = roundFn;
  }

  abstract canParse(type: string, sourceName?: string): boolean;
  abstract parse(fields: string[]): HealthRecord | null;
}

class SleepAnalysisParser extends HealthRecordParser {
  canParse(type: string): boolean {
    return type === "HKCategoryTypeIdentifierSleepAnalysis";
  }

  parse(fields: string[]): HealthRecord | null {
    if (fields.length < 8) return null;

    const type = fields[0];
    const startDate = fields[5];
    const endDate = fields[6];
    const value = fields[7];
    const dateKey = this.extractDate(startDate);
    const duration = this.calculateDurationMinutes(startDate, endDate);

    return {
      date: dateKey,
      type: type,
      value: value,
      duration: duration,
      startDate: startDate,
      endDate: endDate,
    };
  }

  private calculateDurationMinutes(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round((end.getTime() - start.getTime()) / MILLISECONDS_PER_MINUTE);
  }
}

class StepCountParser extends HealthRecordParser {
  canParse(type: string, sourceName?: string): boolean {
    return (
      type === "HKQuantityTypeIdentifierStepCount" && sourceName === "Zepp Life"
    );
  }

  parse(fields: string[]): HealthRecord | null {
    if (fields.length < 9) return null;

    const type = fields[0];
    const startDate = fields[5];
    const unit = fields[7];
    const value = fields[8];
    const dateKey = this.extractDate(startDate);

    return {
      date: dateKey,
      type: type,
      value: this.roundToTwoDecimals(parseFloat(value)),
      unit: unit,
    };
  }
}

class BodyMetricsParser extends HealthRecordParser {
  canParse(type: string): boolean {
    return (
      type !== "HKCategoryTypeIdentifierSleepAnalysis" &&
      type !== "HKQuantityTypeIdentifierStepCount"
    );
  }

  parse(fields: string[]): HealthRecord | null {
    if (fields.length < 9) return null;

    const type = fields[0];
    const startDate = fields[5];
    const unit = fields[7];
    const value = fields[8];
    const dateKey = this.extractDate(startDate);

    const parsedValue =
      type === "HKQuantityTypeIdentifierBodyFatPercentage"
        ? this.roundToTwoDecimals(parseFloat(value) * 100) // Convert to full percentage
        : this.roundToTwoDecimals(parseFloat(value));

    return {
      date: dateKey,
      type: type,
      value: parsedValue,
      unit: unit,
    };
  }
}

interface MetricProcessor {
  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void;
}

class BodyCompositionProcessor implements MetricProcessor {
  private static readonly BODY_METRICS = [
    "HKQuantityTypeIdentifierBodyFatPercentage",
    "HKQuantityTypeIdentifierBodyMass",
    "HKQuantityTypeIdentifierBodyMassIndex",
    "HKQuantityTypeIdentifierLeanBodyMass",
  ];

  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    for (const date in groupedData) {
      const dateData = groupedData[date];

      if (!combined[date]) {
        combined[date] = { date, metrics: {} };
      }

      for (const type in dateData) {
        if (BodyCompositionProcessor.BODY_METRICS.includes(type)) {
          const records = dateData[type];
          if (records.length > 0) {
            const measurementType = type.replace(
              "HKQuantityTypeIdentifier",
              "",
            );
            combined[date].metrics![measurementType] = records[0]
              .value as number;
          }
        }
      }
    }
  }
}

class GenericQuantityProcessor implements MetricProcessor {
  constructor(
    private healthKitIdentifier: string,
    private metricName: string,
    private calculateValue: (data: HealthRecord[]) => number | null,
  ) {}

  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    for (const date in groupedData) {
      const dateData = groupedData[date];
      const metricData = dateData[this.healthKitIdentifier];

      if (metricData) {
        const calculatedValue = this.calculateValue(metricData);
        if (calculatedValue !== null) {
          if (!combined[date]) {
            combined[date] = { date, metrics: {} };
          }
          combined[date].metrics![this.metricName] = calculatedValue;
        }
      }
    }
  }
}

class SleepCalculator {
  private static readonly ASLEEP_STATES = [
    "asleepCore",
    "asleepDeep",
    "asleepREM",
  ];
  private static readonly MINUTES_PER_HOUR = 60;

  static calculateSleepMetrics(sleepData: HealthRecord[]): SleepMetrics | null {
    if (!sleepData?.length) return null;

    const sleepMetrics = {
      inBed: 0,
      asleepCore: 0,
      asleepDeep: 0,
      asleepREM: 0,
      awake: 0,
      wakeUps: 0,
    };

    let previousState: string | null = null;

    for (const record of sleepData) {
      const duration = record.duration || 0;
      const state = record.value as string;

      if (state in sleepMetrics) {
        sleepMetrics[state as keyof typeof sleepMetrics] += duration;
      }

      if (
        previousState &&
        this.ASLEEP_STATES.includes(previousState) &&
        state === "awake"
      ) {
        sleepMetrics.wakeUps++;
      }

      previousState = state;
    }

    const totalSleep =
      sleepMetrics.asleepCore +
      sleepMetrics.asleepDeep +
      sleepMetrics.asleepREM;

    return {
      Core: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepCore)),
      Deep: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepDeep)),
      REM: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepREM)),
      Total: this.formatTimeFromMinutes(Math.round(totalSleep)),
      wakeUps: sleepMetrics.wakeUps,
    };
  }

  static groupSleepDataBySession(
    data: HealthRecord[],
  ): Record<string, HealthRecord[]> {
    const sessions: Record<string, HealthRecord[]> = {};
    const sessionThreshold = 120;

    data.sort(
      (a, b) =>
        new Date(a.startDate || "").getTime() -
        new Date(b.startDate || "").getTime(),
    );

    let currentSessionStart: string | null = null;

    for (const record of data) {
      if (!record.startDate || !record.endDate) continue;

      const recordStart = new Date(record.startDate).getTime();

      if (currentSessionStart === null) {
        currentSessionStart = record.startDate;
        sessions[currentSessionStart] = [record];
        continue;
      }

      const lastSession = sessions[currentSessionStart];
      const lastRecord = lastSession[lastSession.length - 1];
      if (!lastRecord.endDate) continue;

      const lastEnd = new Date(lastRecord.endDate).getTime();
      const gapMinutes = (recordStart - lastEnd) / (1000 * 60);

      if (gapMinutes > sessionThreshold) {
        currentSessionStart = record.startDate;
        sessions[currentSessionStart] = [record];
      } else {
        lastSession.push(record);
      }
    }

    return sessions;
  }

  private static formatTimeFromMinutes(minutes: number): string {
    const hours = Math.floor(minutes / this.MINUTES_PER_HOUR);
    const remainingMinutes = minutes % this.MINUTES_PER_HOUR;
    return `${hours}h ${remainingMinutes}m`;
  }
}

class SleepMetricsProcessor implements MetricProcessor {
  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    const allSleepData: HealthRecord[] = [];

    for (const date in groupedData) {
      const sleepData =
        groupedData[date]["HKCategoryTypeIdentifierSleepAnalysis"];
      if (sleepData) {
        allSleepData.push(...sleepData);
      }
    }

    if (allSleepData.length > 0) {
      const sleepSessions =
        SleepCalculator.groupSleepDataBySession(allSleepData);

      for (const sessionDate in sleepSessions) {
        const sessionData = sleepSessions[sessionDate];
        const sleepMetrics = SleepCalculator.calculateSleepMetrics(sessionData);

        if (sleepMetrics !== null) {
          if (!combined[sessionDate]) {
            combined[sessionDate] = { date: sessionDate, metrics: {} };
          }
          combined[sessionDate].metrics!["Sleep"] = sleepMetrics;
        }
      }
    }
  }
}

class DerivedMetricsProcessor implements MetricProcessor {
  constructor(
    private calculateHeight: (bodyMass: number, bmi: number) => number,
    private calculateFFMI: (leanBodyMass: number, height: number) => number,
    private calculateBCI: (ffmi: number, bodyFatPercentage: number) => number,
    private roundToTwoDecimals: (value: number) => number,
  ) {}

  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    for (const date in combined) {
      const measurements = combined[date].metrics as Record<
        string,
        number | SleepMetrics
      >;

      if (
        measurements["BodyMass"] &&
        measurements["BodyMassIndex"] &&
        measurements["LeanBodyMass"] &&
        measurements["BodyFatPercentage"]
      ) {
        const bodyMass = measurements["BodyMass"] as number;
        const bmi = measurements["BodyMassIndex"] as number;
        const leanBodyMass = measurements["LeanBodyMass"] as number;
        const bodyFatPercentage = measurements["BodyFatPercentage"] as number;

        const height = this.calculateHeight(bodyMass, bmi);
        const ffmi = this.calculateFFMI(leanBodyMass, height);
        const bci = this.calculateBCI(
          ffmi,
          bodyFatPercentage / BODY_FAT_PERCENTAGE_CONVERSION,
        );

        measurements["FFMI"] = this.roundToTwoDecimals(ffmi);
        measurements["BCI"] = this.roundToTwoDecimals(bci);
      }
    }
  }
}

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
        this.calculateAverageHeartRate.bind(this),
      ),
      new GenericQuantityProcessor(
        "HKQuantityTypeIdentifierStepCount",
        "StepCount",
        this.calculateTotalSteps.bind(this),
      ),
      new SleepMetricsProcessor(),
      new DerivedMetricsProcessor(
        this.calculateHeight.bind(this),
        this.calculateFFMI.bind(this),
        this.calculateBCI.bind(this),
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

  /**
   * Find all CSV health data files in the sources directory
   * Only processes files that start with "HK"
   * @returns Array of CSV file paths
   */
  private findHealthDataFiles(): string[] {
    return this.findFilesByExtension(".csv", "HK");
  }

  /**
   * Calculate height from BMI and body mass
   * @param bodyMass - Body mass in kg
   * @param bmi - Body mass index
   * @returns Height in meters
   */
  private calculateHeight(bodyMass: number, bmi: number): number {
    return Math.sqrt(bodyMass / bmi);
  }

  /**
   * Calculate FFMI (Fat-Free Mass Index)
   * @param leanBodyMass - Lean body mass in kg
   * @param height - Height in meters
   * @returns FFMI value
   */
  private calculateFFMI(leanBodyMass: number, height: number): number {
    return leanBodyMass / (height * height);
  }

  /**
   * Calculate BCI (Body Composition Index)
   * @param ffmi - FFMI value
   * @param bodyFatPercentage - Body fat percentage (0-1)
   * @returns BCI value
   */
  private calculateBCI(ffmi: number, bodyFatPercentage: number): number {
    return ffmi * (1 - bodyFatPercentage);
  }

  /**
   * Calculate average heart rate for a day
   * @param heartRateData - Array of heart rate records
   * @returns Average heart rate or null if no data
   */
  private calculateAverageHeartRate(
    heartRateData: HealthRecord[],
  ): number | null {
    if (!heartRateData || heartRateData.length === 0) {
      return null;
    }

    const sum = heartRateData.reduce(
      (acc, record) => acc + (record.value as number),
      0,
    );
    return this.roundToTwoDecimals(sum / heartRateData.length);
  }

  /**
   * Calculate total steps for a day
   * @param stepData - Array of step records
   * @returns Total steps or null if no data
   */
  private calculateTotalSteps(stepData: HealthRecord[]): number | null {
    if (!stepData || stepData.length === 0) {
      return null;
    }

    const total = stepData.reduce(
      (acc, record) => acc + (record.value as number),
      0,
    );
    return Math.round(total);
  }

  /**
   * Calculate sleep metrics for a day
   * @param sleepData - Array of sleep records
   * @returns Sleep metrics or null if no data
   */
  private calculateSleepMetrics(
    sleepData: HealthRecord[],
  ): SleepMetrics | null {
    if (!sleepData || sleepData.length === 0) {
      return null;
    }

    const sleepMetrics: Record<string, number> = {
      inBed: 0,
      asleepCore: 0,
      asleepDeep: 0,
      asleepREM: 0,
      awake: 0,
      wakeUps: 0,
    };

    let previousState: string | null = null;

    for (const record of sleepData) {
      const duration = record.duration || 0;
      const state = record.value as string;

      if (Object.prototype.hasOwnProperty.call(sleepMetrics, state)) {
        sleepMetrics[state] += duration;
      }

      // Count wake-ups (transitions from asleep to awake)
      const asleepStates = ["asleepCore", "asleepDeep", "asleepREM"];
      if (
        previousState &&
        asleepStates.includes(previousState) &&
        state === "awake"
      ) {
        sleepMetrics.wakeUps++;
      }

      previousState = state;
    }

    const totalSleep =
      sleepMetrics.asleepCore +
      sleepMetrics.asleepDeep +
      sleepMetrics.asleepREM;

    return {
      Core: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepCore)),
      Deep: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepDeep)),
      REM: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepREM)),
      Total: this.formatTimeFromMinutes(Math.round(totalSleep)),
      wakeUps: sleepMetrics.wakeUps,
    };
  }

  /**
   * Format minutes into "##h ##m" format
   * @param minutes - Minutes to format
   * @returns Formatted time string
   */
  private formatTimeFromMinutes(minutes: number): string {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const mins = minutes % MINUTES_PER_HOUR;
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  }

  /**
   * Group sleep data by sleep session (handles cross-midnight sessions)
   * @param sleepData - Array of sleep records
   * @returns Sleep sessions grouped by date
   */
  private groupSleepDataBySession(
    sleepData: HealthRecord[],
  ): Record<string, HealthRecord[]> {
    if (!sleepData || sleepData.length === 0) {
      return {};
    }

    const sortedData = sleepData.sort(
      (a, b) =>
        new Date(a.startDate || "").getTime() -
        new Date(b.startDate || "").getTime(),
    );

    const sessions: Record<string, HealthRecord[]> = {};
    let sessionData: HealthRecord[] = [];

    for (const record of sortedData) {
      const startTime = new Date(record.startDate || "");

      if (
        sessionData.length === 0 ||
        startTime.getTime() -
          new Date(
            sessionData[sessionData.length - 1].endDate || "",
          ).getTime() >
          SLEEP_SESSION_GAP_THRESHOLD_MS
      ) {
        if (sessionData.length > 0) {
          const sessionKey = this.extractDate(sessionData[0].startDate || "");
          sessions[sessionKey] = sessionData;
        }
        sessionData = [record];
      } else {
        sessionData.push(record);
      }
    }

    if (sessionData.length > 0) {
      const sessionKey = this.extractDate(sessionData[0].startDate || "");
      sessions[sessionKey] = sessionData;
    }

    return sessions;
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
