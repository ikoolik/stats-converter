import { HealthRecord, HealthRecordParser } from "./base";

export class BodyMetricsParser extends HealthRecordParser {
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
        ? this.roundToTwoDecimals(parseFloat(value) * 100)
        : this.roundToTwoDecimals(parseFloat(value));

    return {
      date: dateKey,
      type: type,
      value: parsedValue,
      unit: unit,
    };
  }
}
