import { calculateHealthSummary } from "../../../processors/utils/health-summary";
import { DailyMetrics } from "../../../types";

describe("Health Summary Calculation", () => {
  it("should calculate summary for empty daily metrics", () => {
    const dailyMetrics: DailyMetrics[] = [];
    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({});
  });

  it("should calculate summary for single day with numeric metrics", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.5,
          BodyFatPercentage: 15.2,
          HeartRate: 65.3,
          StepCount: 8500,
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.5,
      BodyFatPercentage: 15.2,
      HeartRate: 65.3,
      StepCount: 8500,
    });
  });

  it("should calculate average for multiple days with numeric metrics", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.0,
          HeartRate: 65.0,
          StepCount: 8000,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.5,
          HeartRate: 67.0,
          StepCount: 9000,
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          BodyMass: 81.0,
          HeartRate: 66.0,
          StepCount: 8500,
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.5, // (80.0 + 80.5 + 81.0) / 3
      HeartRate: 66.0, // (65.0 + 67.0 + 66.0) / 3
      StepCount: 8500, // (8000 + 9000 + 8500) / 3
    });
  });

  it("should handle sleep metrics correctly", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          Sleep: {
            Core: "6h 0m",
            Deep: "2h 0m",
            REM: "1h 30m",
            Total: "9h 30m",
            wakeUps: 2,
          },
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          Sleep: {
            Core: "5h 30m",
            Deep: "1h 30m",
            REM: "1h 0m",
            Total: "8h 0m",
            wakeUps: 1,
          },
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      Sleep: {
        Core: "5h 45m", // Average of 6h 0m and 5h 30m = 5h 45m
        Deep: "1h 45m", // Average of 2h 0m and 1h 30m = 1h 45m
        REM: "1h 15m", // Average of 1h 30m and 1h 0m = 1h 15m
        Total: "8h 45m", // Average of 9h 30m and 8h 0m = 8h 45m
        wakeUps: 1.5, // Average of 2 and 1 = 1.5
      },
    });
  });

  it("should handle mixed metrics (numeric and sleep)", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.0,
          HeartRate: 65.0,
          Sleep: {
            Core: "6h 0m",
            Deep: "2h 0m",
            REM: "1h 30m",
            Total: "9h 30m",
            wakeUps: 2,
          },
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.5,
          HeartRate: 67.0,
          Sleep: {
            Core: "5h 30m",
            Deep: "1h 30m",
            REM: "1h 0m",
            Total: "8h 0m",
            wakeUps: 1,
          },
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.25, // (80.0 + 80.5) / 2
      HeartRate: 66.0, // (65.0 + 67.0) / 2
      Sleep: {
        Core: "5h 45m",
        Deep: "1h 45m",
        REM: "1h 15m",
        Total: "8h 45m",
        wakeUps: 1.5,
      },
    });
  });

  it("should handle missing metrics gracefully", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.0,
          HeartRate: 65.0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.5,
          // Missing HeartRate
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          HeartRate: 67.0,
          // Missing BodyMass
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.25, // (80.0 + 80.5) / 2 (only 2 values)
      HeartRate: 66.0, // (65.0 + 67.0) / 2 (only 2 values)
    });
  });

  it("should handle null and undefined values", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.0,
          HeartRate: null as unknown,
          StepCount: undefined as unknown,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.5,
          HeartRate: 67.0,
          StepCount: 8500,
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.25, // (80.0 + 80.5) / 2
      HeartRate: 67.0, // Only the non-null value
      StepCount: 8500, // Only the non-undefined value
    });
  });

  it("should handle empty sleep data", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          Sleep: {
            Core: "0h 0m",
            Deep: "0h 0m",
            REM: "0h 0m",
            Total: "0h 0m",
            wakeUps: 0,
          },
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      Sleep: {
        Core: "0h 0m",
        Deep: "0h 0m",
        REM: "0h 0m",
        Total: "0h 0m",
        wakeUps: 0,
      },
    });
  });

  it("should round numeric values to two decimal places", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.123,
          HeartRate: 65.789,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.456,
          HeartRate: 67.123,
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.29, // (80.123 + 80.456) / 2 = 80.2895 → 80.29
      HeartRate: 66.46, // (65.789 + 67.123) / 2 = 66.456 → 66.46
    });
  });

  it("should handle complex real-world scenario", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          BodyMass: 80.0,
          BodyFatPercentage: 15.0,
          HeartRate: 65.0,
          StepCount: 8000,
          Sleep: {
            Core: "6h 0m",
            Deep: "2h 0m",
            REM: "1h 30m",
            Total: "9h 30m",
            wakeUps: 2,
          },
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          BodyMass: 80.5,
          BodyFatPercentage: 15.2,
          HeartRate: 67.0,
          StepCount: 9000,
          Sleep: {
            Core: "5h 30m",
            Deep: "1h 30m",
            REM: "1h 0m",
            Total: "8h 0m",
            wakeUps: 1,
          },
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          BodyMass: 81.0,
          BodyFatPercentage: 15.1,
          HeartRate: 66.0,
          StepCount: 8500,
          Sleep: {
            Core: "6h 30m",
            Deep: "1h 45m",
            REM: "1h 15m",
            Total: "9h 30m",
            wakeUps: 0,
          },
        },
      },
    ];

    const summary = calculateHealthSummary(dailyMetrics);

    expect(summary).toEqual({
      BodyMass: 80.5, // (80.0 + 80.5 + 81.0) / 3
      BodyFatPercentage: 15.1, // (15.0 + 15.2 + 15.1) / 3
      HeartRate: 66.0, // (65.0 + 67.0 + 66.0) / 3
      StepCount: 8500, // (8000 + 9000 + 8500) / 3
      Sleep: {
        Core: "6h 0m", // Average of 6h 0m, 5h 30m, 6h 30m = 6h 0m
        Deep: "1h 45m", // Average of 2h 0m, 1h 30m, 1h 45m = 1h 45m
        REM: "1h 15m", // Average of 1h 30m, 1h 0m, 1h 15m = 1h 15m
        Total: "9h 0m", // Average of 9h 30m, 8h 0m, 9h 30m = 9h 0m
        wakeUps: 1.0, // Average of 2, 1, 0 = 1.0
      },
    });
  });
});
