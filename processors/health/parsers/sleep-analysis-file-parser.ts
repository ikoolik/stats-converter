import { BaseFileParser, ParserUtils, HealthRecord } from "./base";
import { DailyMetrics } from "../../../types";
import { CSVRecord } from "../csv-reader";
import { SleepCalculator } from "../sleep-calculator";
import { MILLISECONDS_PER_MINUTE } from "../constants";

export class SleepAnalysisFileParser extends BaseFileParser {
  parseFile(records: CSVRecord[]): DailyMetrics[] {
    const healthRecords: HealthRecord[] = [];

    // Convert CSV records to HealthRecords
    for (const record of records) {
      if (record.fields.length < 8) continue;

      const startDate = record.fields[5];
      const endDate = record.fields[6];
      const value = record.fields[7].replace(/\r?\n/g, "").trim();
      const dateKey = ParserUtils.extractDate(startDate);
      const duration = this.calculateDurationMinutes(startDate, endDate);

      healthRecords.push({
        date: dateKey,
        type: record.type,
        value: value,
        duration: duration,
        startDate: startDate,
        endDate: endDate,
      });
    }

    // Group by sleep sessions
    const sessionGroups =
      SleepCalculator.groupSleepDataBySession(healthRecords);
    const dailyMetrics: Record<string, DailyMetrics> = {};

    // Process each sleep session
    for (const [date, sessionData] of Object.entries(sessionGroups)) {
      const sleepMetrics = SleepCalculator.calculateSleepMetrics(sessionData);

      if (sleepMetrics) {
        if (!dailyMetrics[date]) {
          dailyMetrics[date] = {
            date: date,
            metrics: {},
          };
        }

        dailyMetrics[date].metrics.sleep = sleepMetrics;
      }
    }

    return Object.values(dailyMetrics);
  }

  private calculateDurationMinutes(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.round(
      (end.getTime() - start.getTime()) / MILLISECONDS_PER_MINUTE,
    );
  }
}
