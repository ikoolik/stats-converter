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
      if (record.sourceName !== "Zepp Life") continue;

      const startDate = record.fields[5];
      const unit = record.fields[7];
      const value = record.fields[8].replace(/\r?\n/g, "").trim();
      const dateKey = ParserUtils.extractDate(startDate);

      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = {
          date: dateKey,
          metrics: {},
        };
      }

      dailyMetrics[dateKey].metrics.stepCount = {
        value: ParserUtils.roundToTwoDecimals(parseFloat(value)),
        unit,
      };
    }

    return Object.values(dailyMetrics);
  }
}
