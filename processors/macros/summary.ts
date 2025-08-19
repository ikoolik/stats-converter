import { DailyMetrics } from "../../types";

interface MacrosSummary {
  [key: string]: number;
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
 * Calculate macros summary for a week
 * @param dailyMetrics - Array of daily metrics for the week
 * @returns Macros summary object with averaged metrics
 */
export function calculateMacrosSummary(
  dailyMetrics: DailyMetrics[],
): MacrosSummary {
  if (dailyMetrics.length === 0) {
    return {};
  }

  const metrics = dailyMetrics.map((day) => day.metrics);
  const summary: MacrosSummary = {};

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

    if (typeof values[0] === "number") {
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
