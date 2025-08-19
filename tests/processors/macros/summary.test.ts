import { calculateMacrosSummary } from "../../../processors/macros/summary";
import { DailyMetrics } from "../../../types";

describe("Macros Summary Calculation", () => {
  it("should calculate summary for empty daily metrics", () => {
    const dailyMetrics: DailyMetrics[] = [];
    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({});
  });

  it("should calculate summary for single day with macros", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.5,
          carbs: 150.2,
          protein: 120.8,
          totalKcal: 1850.5,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 60.5,
      carbs: 150.2,
      protein: 120.8,
      totalKcal: 1850.5,
    });
  });

  it("should calculate average for multiple days with macros", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.0,
          carbs: 150.0,
          protein: 120.0,
          totalKcal: 1850.0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.0,
          carbs: 160.0,
          protein: 125.0,
          totalKcal: 1900.0,
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          fat: 70.0,
          carbs: 170.0,
          protein: 130.0,
          totalKcal: 1950.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 65.0, // (60.0 + 65.0 + 70.0) / 3
      carbs: 160.0, // (150.0 + 160.0 + 170.0) / 3
      protein: 125.0, // (120.0 + 125.0 + 130.0) / 3
      totalKcal: 1900.0, // (1850.0 + 1900.0 + 1950.0) / 3
    });
  });

  it("should handle missing macros gracefully", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.0,
          carbs: 150.0,
          protein: 120.0,
          // Missing totalKcal
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.0,
          carbs: 160.0,
          totalKcal: 1900.0,
          // Missing protein
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          protein: 130.0,
          totalKcal: 1950.0,
          // Missing fat and carbs
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 62.5, // (60.0 + 65.0) / 2 (only 2 values)
      carbs: 155.0, // (150.0 + 160.0) / 2 (only 2 values)
      protein: 125.0, // (120.0 + 130.0) / 2 (only 2 values)
      totalKcal: 1925.0, // (1900.0 + 1950.0) / 2 (only 2 values)
    });
  });

  it("should handle null and undefined values", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.0,
          carbs: null as unknown,
          protein: undefined as unknown,
          totalKcal: 1850.0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.0,
          carbs: 160.0,
          protein: 125.0,
          totalKcal: 1900.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 62.5, // (60.0 + 65.0) / 2
      carbs: 160.0, // Only the non-null value
      protein: 125.0, // Only the non-undefined value
      totalKcal: 1875.0, // (1850.0 + 1900.0) / 2
    });
  });

  it("should round values to two decimal places", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.123,
          carbs: 150.456,
          protein: 120.789,
          totalKcal: 1850.123,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.789,
          carbs: 160.123,
          protein: 125.456,
          totalKcal: 1900.789,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 62.96, // (60.123 + 65.789) / 2 = 62.956 → 62.96
      carbs: 155.29, // (150.456 + 160.123) / 2 = 155.2895 → 155.29
      protein: 123.12, // (120.789 + 125.456) / 2 = 123.1225 → 123.12
      totalKcal: 1875.46, // (1850.123 + 1900.789) / 2 = 1875.456 → 1875.46
    });
  });

  it("should handle days with no metrics", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 60.0,
          carbs: 150.0,
          protein: 120.0,
          totalKcal: 1850.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 60.0,
      carbs: 150.0,
      protein: 120.0,
      totalKcal: 1850.0,
    });
  });

  it("should handle complex real-world scenario", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.0,
          carbs: 150.0,
          protein: 120.0,
          totalKcal: 1850.0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.0,
          carbs: 160.0,
          protein: 125.0,
          totalKcal: 1900.0,
        },
      },
      {
        date: "2025-01-03",
        metrics: {
          fat: 70.0,
          carbs: 170.0,
          protein: 130.0,
          totalKcal: 1950.0,
        },
      },
      {
        date: "2025-01-04",
        metrics: {
          fat: 55.0,
          carbs: 140.0,
          protein: 115.0,
          totalKcal: 1800.0,
        },
      },
      {
        date: "2025-01-05",
        metrics: {
          fat: 75.0,
          carbs: 180.0,
          protein: 135.0,
          totalKcal: 2000.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 65.0, // (60.0 + 65.0 + 70.0 + 55.0 + 75.0) / 5
      carbs: 160.0, // (150.0 + 160.0 + 170.0 + 140.0 + 180.0) / 5
      protein: 125.0, // (120.0 + 125.0 + 130.0 + 115.0 + 135.0) / 5
      totalKcal: 1900.0, // (1850.0 + 1900.0 + 1950.0 + 1800.0 + 2000.0) / 5
    });
  });

  it("should handle single macro type", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 60.0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 65.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 62.5,
    });
  });

  it("should handle zero values", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {
          fat: 0,
          carbs: 0,
          protein: 0,
          totalKcal: 0,
        },
      },
      {
        date: "2025-01-02",
        metrics: {
          fat: 60.0,
          carbs: 150.0,
          protein: 120.0,
          totalKcal: 1850.0,
        },
      },
    ];

    const summary = calculateMacrosSummary(dailyMetrics);

    expect(summary).toEqual({
      fat: 30.0, // (0 + 60.0) / 2
      carbs: 75.0, // (0 + 150.0) / 2
      protein: 60.0, // (0 + 120.0) / 2
      totalKcal: 925.0, // (0 + 1850.0) / 2
    });
  });
});
