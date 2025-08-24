import { HealthRecord } from "./parsers/sleep-analysis-file-parser";

/**
 * Type guard functions for health data validation
 */

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isNumber(item));
}

export interface SleepData {
  Core: string;
  Deep: string;
  REM: string;
  Total: string;
  wakeUps: number;
}

export function isSleepDataArray(value: unknown): value is SleepData[] {
  if (!Array.isArray(value)) return false;

  return value.every(
    (item): item is SleepData =>
      item != null &&
      typeof item === "object" &&
      "Core" in item &&
      "Deep" in item &&
      "REM" in item &&
      "Total" in item &&
      "wakeUps" in item &&
      typeof (item as SleepData).Core === "string" &&
      typeof (item as SleepData).Deep === "string" &&
      typeof (item as SleepData).REM === "string" &&
      typeof (item as SleepData).Total === "string" &&
      typeof (item as SleepData).wakeUps === "number",
  );
}

export function validateNumericHealthRecord(
  record: HealthRecord,
): HealthRecord | null {
  if (!record || typeof record.value !== "number") {
    return null;
  }
  return record;
}

export function validateStringHealthRecord(
  record: HealthRecord,
): HealthRecord | null {
  if (!record || typeof record.value !== "string") {
    return null;
  }
  return record;
}
