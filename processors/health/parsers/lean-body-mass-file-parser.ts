import { BaseFileParser, ParserUtils } from "./base";
import { DailyMetrics } from "../../../types";
import { CSVRecord } from "../csv-reader";

export class LeanBodyMassFileParser extends BaseFileParser {
  parseFile(records: CSVRecord[]): DailyMetrics[] {
    const dailyMetrics: Record<string, DailyMetrics> = {};

    for (const record of records) {
      if (record.fields.length < 9) continue;

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

      dailyMetrics[dateKey].metrics.leanBodyMass = {
        value: ParserUtils.roundToTwoDecimals(parseFloat(value)),
        unit,
      };
    }

    return Object.values(dailyMetrics);
  }
}
