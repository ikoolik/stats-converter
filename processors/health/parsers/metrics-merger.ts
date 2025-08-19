import { DailyMetrics } from "../../../types";

/**
 * Utility functions for merging DailyMetrics from different parsers
 */
export class MetricsMerger {
  /**
   * Flat merge DailyMetrics from different parsers into unified DailyMetrics
   * @param metricsSets Array of DailyMetrics arrays from different parsers
   * @returns Unified array of DailyMetrics with merged data by date
   */
  static flatMerge(metricsSets: DailyMetrics[][]): DailyMetrics[] {
    const mergedByDate: Record<string, DailyMetrics> = {};

    // Process all metrics from all parsers
    for (const metricsSet of metricsSets) {
      for (const dailyMetrics of metricsSet) {
        const date = dailyMetrics.date;

        if (!mergedByDate[date]) {
          // First time seeing this date - initialize with current metrics
          mergedByDate[date] = {
            date,
            metrics: { ...dailyMetrics.metrics },
            exercises: dailyMetrics.exercises
              ? [...dailyMetrics.exercises]
              : undefined,
            description: dailyMetrics.description,
          };
        } else {
          // Date already exists - merge metrics
          const existing = mergedByDate[date];

          // Merge metrics objects
          existing.metrics = { ...existing.metrics, ...dailyMetrics.metrics };

          // Merge exercises if present
          if (dailyMetrics.exercises) {
            if (existing.exercises) {
              existing.exercises.push(...dailyMetrics.exercises);
            } else {
              existing.exercises = [...dailyMetrics.exercises];
            }
          }

          // Update description (later parsers can override)
          if (dailyMetrics.description) {
            existing.description = dailyMetrics.description;
          }
        }
      }
    }

    // Return sorted by date
    return Object.values(mergedByDate).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
