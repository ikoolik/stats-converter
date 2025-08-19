import { DailyMetrics } from "../../types";
import { BODY_METRICS } from "./constants";
import { HealthRecord } from "./parsers";
import { SleepCalculator, SleepMetrics } from "./sleep-calculator";

export interface MetricProcessor {
  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void;
}

export class BodyCompositionProcessor implements MetricProcessor {
  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    for (const date in groupedData) {
      const dateData = groupedData[date];

      if (!combined[date]) {
        combined[date] = { date, metrics: {} };
      }
      if (!combined[date].metrics) {
        combined[date].metrics = {};
      }

      for (const type in dateData) {
        if (BODY_METRICS.includes(type)) {
          const records = dateData[type];
          if (records.length > 0) {
            const measurementType = type.replace(
              "HKQuantityTypeIdentifier",
              "",
            );
            combined[date].metrics[measurementType] = records[0]
              .value as number;
          }
        }
      }
    }
  }
}

export class GenericQuantityProcessor implements MetricProcessor {
  constructor(
    private readonly healthKitIdentifier: string,
    private readonly metricName: string,
    private readonly calculateValue: (data: HealthRecord[]) => number | null,
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
          if (!combined[date].metrics) {
            combined[date].metrics = {};
          }
          combined[date].metrics[this.metricName] = calculatedValue;
        }
      }
    }
  }
}

export class SleepMetricsProcessor implements MetricProcessor {
  processMetrics(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
    combined: Record<string, DailyMetrics>,
  ): void {
    const allSleepData = this.collectAllSleepData(groupedData);

    if (allSleepData.length > 0) {
      this.processSleepSessions(allSleepData, combined);
    }
  }

  private collectAllSleepData(
    groupedData: Record<string, Record<string, HealthRecord[]>>,
  ): HealthRecord[] {
    const allSleepData: HealthRecord[] = [];

    for (const date in groupedData) {
      const sleepData =
        groupedData[date]["HKCategoryTypeIdentifierSleepAnalysis"];
      if (sleepData) {
        allSleepData.push(...sleepData);
      }
    }

    return allSleepData;
  }

  private processSleepSessions(
    allSleepData: HealthRecord[],
    combined: Record<string, DailyMetrics>,
  ): void {
    const sleepSessions = SleepCalculator.groupSleepDataBySession(allSleepData);

    for (const sessionDate in sleepSessions) {
      const sessionData = sleepSessions[sessionDate];
      console.log("calculating sleep for ", sessionDate);
      const sleepMetrics = SleepCalculator.calculateSleepMetrics(sessionData);

      if (sleepMetrics !== null) {
        this.ensureDailyMetricsExists(combined, sessionDate);
        combined[sessionDate].metrics["Sleep"] = sleepMetrics;
      }
    }
  }

  private ensureDailyMetricsExists(
    combined: Record<string, DailyMetrics>,
    sessionDate: string,
  ): void {
    if (!combined[sessionDate]) {
      combined[sessionDate] = { date: sessionDate, metrics: {} };
    }
  }
}

export class DerivedMetricsProcessor implements MetricProcessor {
  constructor(
    private readonly calculateHeight: (bodyMass: number, bmi: number) => number,
    private readonly calculateFFMI: (
      leanBodyMass: number,
      height: number,
    ) => number,
    private readonly calculateBCI: (
      ffmi: number,
      bodyFatPercentage: number,
    ) => number,
    private readonly roundToTwoDecimals: (value: number) => number,
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
        const bci = this.calculateBCI(ffmi, bodyFatPercentage / 100);

        measurements["FFMI"] = this.roundToTwoDecimals(ffmi);
        measurements["BCI"] = this.roundToTwoDecimals(bci);
      }
    }
  }
}
