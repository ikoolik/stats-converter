import { MetricsMerger } from "../../../processors/health/parsers/metrics-merger";
import { DailyMetrics } from "../../../types";

describe("MetricsMerger", () => {
  describe("flatMerge", () => {
    test("merges metrics from different parsers by date", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            BodyMass: 75.5,
            HeartRate: 72,
          },
        },
        {
          date: "2025-08-18",
          metrics: {
            BodyMass: 75.3,
          },
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            StepCount: 8500,
            BodyFatPercentage: 15.2,
          },
        },
        {
          date: "2025-08-19",
          metrics: {
            StepCount: 9200,
          },
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          date: "2025-08-17",
          metrics: {
            BodyMass: 75.5,
            HeartRate: 72,
            StepCount: 8500,
            BodyFatPercentage: 15.2,
          },
        },
        {
          date: "2025-08-18",
          metrics: {
            BodyMass: 75.3,
          },
        },
        {
          date: "2025-08-19",
          metrics: {
            StepCount: 9200,
          },
        },
      ]);
    });

    test("handles overlapping metric keys (later parsers override)", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            HeartRate: 72,
            StepCount: 5000,
          },
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            StepCount: 8500, // This should override the previous value
            BodyMass: 75.5,
          },
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0].metrics).toEqual({
        HeartRate: 72,
        StepCount: 8500, // Overridden value
        BodyMass: 75.5,
      });
    });

    test("merges exercises arrays", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {},
          exercises: [{ name: "Push-ups", sets: 3, reps: 15 }],
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {},
          exercises: [{ name: "Squats", sets: 3, reps: 20 }],
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0].exercises).toHaveLength(2);
      expect(result[0].exercises).toEqual([
        { name: "Push-ups", sets: 3, reps: 15 },
        { name: "Squats", sets: 3, reps: 20 },
      ]);
    });

    test("handles exercises from one parser only", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { HeartRate: 72 },
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { StepCount: 8500 },
          exercises: [{ name: "Running", duration: 30, distance: "5km" }],
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0].exercises).toHaveLength(1);
      expect(result[0].exercises).toEqual([
        { name: "Running", duration: 30, distance: "5km" },
      ]);
    });

    test("updates description from later parsers", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { HeartRate: 72 },
          description: "Initial description",
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { StepCount: 8500 },
          description: "Updated description",
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Updated description");
    });

    test("preserves description when later parser doesn't provide one", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { HeartRate: 72 },
          description: "Original description",
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { StepCount: 8500 },
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Original description");
    });

    test("sorts results by date", () => {
      const metricsSet1: DailyMetrics[] = [
        {
          date: "2025-08-19",
          metrics: { HeartRate: 72 },
        },
        {
          date: "2025-08-17",
          metrics: { HeartRate: 68 },
        },
      ];

      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-18",
          metrics: { StepCount: 8500 },
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.date)).toEqual([
        "2025-08-17",
        "2025-08-18",
        "2025-08-19",
      ]);
    });

    test("handles empty input arrays", () => {
      const result = MetricsMerger.flatMerge([]);
      expect(result).toEqual([]);
    });

    test("handles arrays with empty DailyMetrics arrays", () => {
      const metricsSet1: DailyMetrics[] = [];
      const metricsSet2: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: { HeartRate: 72 },
        },
      ];

      const result = MetricsMerger.flatMerge([metricsSet1, metricsSet2]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-17",
        metrics: { HeartRate: 72 },
      });
    });

    test("handles complex real-world scenario", () => {
      // Health CSV parser results
      const healthMetrics: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            BodyMass: 75.5,
            BodyFatPercentage: 15.2,
            LeanBodyMass: 64.0,
            HeartRate: 72,
            StepCount: 8500,
            FFMI: 18.5,
            BCI: 1.2,
          },
        },
      ];

      // Sleep analysis results (separate parser)
      const sleepMetrics: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {
            sleepDuration: 480,
            sleepSessions: 1,
          },
        },
      ];

      // Training data results (separate parser)
      const trainingMetrics: DailyMetrics[] = [
        {
          date: "2025-08-17",
          metrics: {},
          exercises: [{ name: "Bench Press", sets: 3, reps: 10, weight: 80 }],
        },
      ];

      const result = MetricsMerger.flatMerge([
        healthMetrics,
        sleepMetrics,
        trainingMetrics,
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-17",
        metrics: {
          BodyMass: 75.5,
          BodyFatPercentage: 15.2,
          LeanBodyMass: 64.0,
          HeartRate: 72,
          StepCount: 8500,
          FFMI: 18.5,
          BCI: 1.2,
          sleepDuration: 480,
          sleepSessions: 1,
        },
        exercises: [{ name: "Bench Press", sets: 3, reps: 10, weight: 80 }],
      });
    });
  });
});
