import { DailyMetrics } from "../../types";
import { ParserUtils } from "./parsers/base";
import { isNumber } from "./type-guards";

/**
 * Utility class for merging DailyMetrics from multiple parsers
 */
export class MetricsMerger {
  /**
   * Merge multiple arrays of DailyMetrics into a single array
   * Groups by date and combines all metrics for each date
   */
  static merge(metricsArrays: DailyMetrics[][]): DailyMetrics[] {
    const combined: Record<string, DailyMetrics> = {};

    // Merge all metrics by date
    for (const metricsArray of metricsArrays) {
      for (const dailyMetric of metricsArray) {
        const date = dailyMetric.date;

        if (!combined[date]) {
          combined[date] = {
            date,
            metrics: {},
          };
        }

        // Merge metrics from this daily metric
        Object.assign(combined[date].metrics, dailyMetric.metrics);
      }
    }

    // Calculate derived metrics after all base metrics are merged
    this.calculateDerivedMetrics(combined);

    return Object.values(combined);
  }

  /**
   * Calculate derived metrics like FFMI and BCI from base body composition metrics
   */
  private static calculateDerivedMetrics(
    combined: Record<string, DailyMetrics>,
  ): void {
    for (const date in combined) {
      const metrics = combined[date].metrics;

      // Check if we have all required body composition metrics
      if (
        metrics.bodyMass &&
        metrics.bodyMassIndex &&
        metrics.leanBodyMass &&
        metrics.bodyFatPercentage
      ) {
        const bodyMass = this.extractNumericValue(metrics.bodyMass);
        const bmi = this.extractNumericValue(metrics.bodyMassIndex);
        const leanBodyMass = this.extractNumericValue(metrics.leanBodyMass);
        const bodyFatPercentage = this.extractNumericValue(
          metrics.bodyFatPercentage,
        );

        // Validate all measurements are numbers before proceeding
        if (
          isNumber(bodyMass) &&
          isNumber(bmi) &&
          isNumber(leanBodyMass) &&
          isNumber(bodyFatPercentage)
        ) {
          const height = calculateHeight(bodyMass, bmi);
          const ffmi = calculateFFMI(leanBodyMass, height);
          const bci = calculateBCI(ffmi, bodyFatPercentage / 100);

          metrics.FFMI = {
            value: ParserUtils.roundToTwoDecimals(ffmi),
            unit: "kg/m²",
          };
          metrics.BCI = {
            value: ParserUtils.roundToTwoDecimals(bci),
            unit: "",
          };
        }
      }
    }
  }

  /**
   * Extract numeric value from metric object or return the value if it's already a number
   */
  private static extractNumericValue(metric: unknown): number | null {
    if (isNumber(metric)) {
      return metric;
    }

    if (typeof metric === "object" && metric !== null && "value" in metric) {
      const value = (metric as { value: unknown }).value;
      return isNumber(value) ? value : null;
    }

    return null;
  }
}

export function calculateHeight(bodyMass: number, bmi: number): number {
  return Math.sqrt(bodyMass / bmi);
}

export function calculateFFMI(leanBodyMass: number, height: number): number {
  return leanBodyMass / (height * height);
}

export function calculateBCI(ffmi: number, bodyFatPercentage: number): number {
  return ffmi * (1 - bodyFatPercentage);
}

