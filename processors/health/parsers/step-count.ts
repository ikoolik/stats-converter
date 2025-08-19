import { HealthRecord, HealthRecordParser } from "./base";

export class StepCountParser extends HealthRecordParser {
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
