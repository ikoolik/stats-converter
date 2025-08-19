import { MILLISECONDS_PER_MINUTE } from "./constants";

export interface HealthRecord {
  date: string;
  type: string;
  value: number | string;
  duration?: number;
  startDate?: string;
  endDate?: string;
  unit?: string;
}

export abstract class HealthRecordParser {
  protected extractDate: (dateString: string) => string;
  protected roundToTwoDecimals: (value: number) => number;

  constructor(
    extractDateFn: (dateString: string) => string,
    roundFn: (value: number) => number,
  ) {
    this.extractDate = extractDateFn;
    this.roundToTwoDecimals = roundFn;
  }

  abstract canParse(type: string, sourceName?: string): boolean;
  abstract parse(fields: string[]): HealthRecord | null;
}

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
