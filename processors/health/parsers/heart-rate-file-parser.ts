import { BaseFileParser, ParserUtils } from "./base";
import { DailyMetrics } from "../../../types";
import { CSVRecord } from "../csv-reader";

export class HeartRateFileParser extends BaseFileParser {
  parseFile(records: CSVRecord[]): DailyMetrics[] {
    const dailyData: Record<string, { values: number[]; unit: string }> = {};

    for (const record of records) {
      if (record.fields.length < 9) continue;

      const startDate = record.fields[5];
      const unit = record.fields[7];
      const value = record.fields[8].replace(/\r?\n/g, "").trim();
      const dateKey = ParserUtils.extractDate(startDate);

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          values: [],
          unit,
        };
      }

      dailyData[dateKey].values.push(parseFloat(value));
    }

    const dailyMetrics: DailyMetrics[] = [];

    for (const [date, data] of Object.entries(dailyData)) {
      const values = data.values;
      const avgHeartRate = ParserUtils.roundToTwoDecimals(
        values.reduce((sum, val) => sum + val, 0) / values.length,
      );
      const maxHeartRate = ParserUtils.roundToTwoDecimals(Math.max(...values));
      const minHeartRate = ParserUtils.roundToTwoDecimals(Math.min(...values));

      dailyMetrics.push({
        date,
        metrics: {
          heartRate: {
            average: { value: avgHeartRate, unit: data.unit },
            max: { value: maxHeartRate, unit: data.unit },
            min: { value: minHeartRate, unit: data.unit },
          },
        },
      });
    }

    return dailyMetrics;
  }
}
