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
