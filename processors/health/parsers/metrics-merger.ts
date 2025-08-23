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
          mergedByDate[date] = this.initializeDailyMetrics(dailyMetrics);
        } else {
          this.mergeExistingMetrics(mergedByDate[date], dailyMetrics);
        }
      }
    }

    // Return sorted by date
    return Object.values(mergedByDate).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  private static initializeDailyMetrics(
    dailyMetrics: DailyMetrics,
  ): DailyMetrics {
    return {
      date: dailyMetrics.date,
      metrics: { ...dailyMetrics.metrics },
      exercises: dailyMetrics.exercises
        ? [...dailyMetrics.exercises]
        : undefined,
      description: dailyMetrics.description,
    };
  }

  private static mergeExistingMetrics(
    existing: DailyMetrics,
    newMetrics: DailyMetrics,
  ): void {
    // Merge metrics objects
    existing.metrics = { ...existing.metrics, ...newMetrics.metrics };

    // Merge exercises if present
    this.mergeExercises(existing, newMetrics);

    // Update description (later parsers can override)
    if (newMetrics.description) {
      existing.description = newMetrics.description;
    }
  }

  private static mergeExercises(
    existing: DailyMetrics,
    newMetrics: DailyMetrics,
  ): void {
    if (!newMetrics.exercises) return;

    if (existing.exercises) {
      existing.exercises.push(...newMetrics.exercises);
    } else {
      existing.exercises = [...newMetrics.exercises];
    }
  }
}
