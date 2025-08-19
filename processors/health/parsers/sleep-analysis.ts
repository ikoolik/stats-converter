import { MILLISECONDS_PER_MINUTE } from "../constants";
import { HealthRecord, HealthRecordParser } from "./base";

export class SleepAnalysisParser extends HealthRecordParser {
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
    return Math.round(
      (end.getTime() - start.getTime()) / MILLISECONDS_PER_MINUTE,
    );
  }
}
