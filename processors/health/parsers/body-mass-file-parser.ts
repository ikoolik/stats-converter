import { BaseFileParser, ParserUtils, CSVRecord } from "./base";
import { DailyMetrics } from "../../../types";

export class BodyMassFileParser extends BaseFileParser {
  parseFile(records: CSVRecord[]): DailyMetrics[] {
    const dailyMetrics: Record<string, DailyMetrics> = {};

    for (const record of records) {
      if (record.fields.length < 9) continue;

      const startDate = record.fields[5];
      const value = record.fields[8].replace(/\r?\n/g, "").trim();
      const dateKey = ParserUtils.extractDate(startDate);

      if (!dailyMetrics[dateKey]) {
        dailyMetrics[dateKey] = {
          date: dateKey,
          metrics: {},
        };
      }

      dailyMetrics[dateKey].metrics.bodyMass = ParserUtils.roundToTwoDecimals(
        parseFloat(value),
      );
    }

    return Object.values(dailyMetrics);
  }
}
