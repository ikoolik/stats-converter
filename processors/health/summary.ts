import { DailyMetrics } from "../../types";

interface SleepData {
  Core: string;
  Deep: string;
  REM: string;
  Total: string;
  wakeUps: number;
}

interface HealthSummary {
  [key: string]: number | SleepData | null;
}

/**
 * Parse time string (e.g., "4h 30m") to minutes
 * @param timeString - Time string in format "Xh Ym"
 * @returns Minutes as number
 */
function parseTimeToMinutes(timeString: string): number {
  const regex = /(\d+)h\s*(\d+)m/;
  const match = regex.exec(timeString);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
}

/**
 * Convert minutes to time string format
 * @param minutes - Total minutes
 * @returns Time string in format "Xh Ym"
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Round values to two decimal places
 * @param value - The value to round
 * @returns The rounded value
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate average sleep metrics
 * @param sleepData - Array of sleep objects
 * @returns Averaged sleep object or null
 */
function calculateAverageSleep(sleepData: SleepData[]): SleepData | null {
  if (sleepData.length === 0) return null;

  const totalCore = sleepData.reduce(
    (sum, sleep) => sum + parseTimeToMinutes(sleep.Core || "0h 0m"),
    0,
  );
  const totalDeep = sleepData.reduce(
    (sum, sleep) => sum + parseTimeToMinutes(sleep.Deep || "0h 0m"),
    0,
  );
  const totalREM = sleepData.reduce(
    (sum, sleep) => sum + parseTimeToMinutes(sleep.REM || "0h 0m"),
    0,
  );
  const totalSleep = sleepData.reduce(
    (sum, sleep) => sum + parseTimeToMinutes(sleep.Total || "0h 0m"),
    0,
  );
  const totalWakeUps = sleepData.reduce(
    (sum, sleep) => sum + (sleep.wakeUps || 0),
    0,
  );

  return {
    Core: minutesToTimeString(Math.round(totalCore / sleepData.length)),
    Deep: minutesToTimeString(Math.round(totalDeep / sleepData.length)),
    REM: minutesToTimeString(Math.round(totalREM / sleepData.length)),
    Total: minutesToTimeString(Math.round(totalSleep / sleepData.length)),
    wakeUps: roundToTwoDecimals(totalWakeUps / sleepData.length),
  };
}

/**
 * Calculate health summary for a week
 * @param dailyMetrics - Array of daily metrics for the week
 * @returns Health summary object with averaged metrics
 */
export function calculateHealthSummary(
  dailyMetrics: DailyMetrics[],
): HealthSummary {
  if (dailyMetrics.length === 0) {
    return {};
  }

  const metrics = dailyMetrics.map((day) => day.metrics);
  const summary: HealthSummary = {};

  // Get all unique metric keys
  const allKeys = new Set<string>();
  metrics.forEach((metric) => {
    Object.keys(metric).forEach((key) => allKeys.add(key));
  });

  // Process each metric type
  allKeys.forEach((key) => {
    const values = metrics
      .map((metric) => metric[key])
      .filter((value) => value !== undefined && value !== null);

    if (values.length === 0) return;

    if (key === "Sleep") {
      // Handle sleep object specially
      const sleepData = values.filter(
        (value) => typeof value === "object" && value !== null,
      );
      summary[key] = calculateAverageSleep(sleepData as SleepData[]);
    } else if (typeof values[0] === "number") {
      // Handle numeric values
      const numericValues = values as number[];
      const average =
        numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      summary[key] = roundToTwoDecimals(average);
    }
    // Skip other types for now
  });

  return summary;
}
