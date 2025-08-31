import { BaseFileParser, ParserUtils, CSVRecord } from "./base";
import { DailyMetrics } from "../../../types";

export class StepCountFileParser extends BaseFileParser {
  getName(): string {
    return "StepCount";
  }

  parseFile(records: CSVRecord[]): DailyMetrics[] {
    const dailyMetrics: Record<string, DailyMetrics> = {};

    for (const record of records) {
      if (record.fields.length < 9) continue;
      if (
        record.sourceName !== "Zepp Life" &&
        record.sourceName !== "Mi Fitness"
      )
        continue;

      const startDate = record.fields[5];
      const value = record.fields[8].replace(/\r?\n/g, "").trim();
      const dateKey = ParserUtils.extractDate(startDate);

      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = {
          date: dateKey,
          metrics: {},
        };
      }

      // Sum up step counts for the same day
      const currentSteps =
        (dailyMetrics[dateKey].metrics.stepCount as number) ?? 0;
      dailyMetrics[dateKey].metrics.stepCount = ParserUtils.roundToTwoDecimals(
        currentSteps + parseFloat(value),
      );
    }

    return Object.values(dailyMetrics);
  }
}
