import { calculateTrainingSummary } from "../../../processors/utils/training-summary";
import { DailyMetrics } from "../../../types";

describe("Training Summary Calculation", () => {
  it("should calculate summary for empty daily metrics", () => {
    const dailyMetrics: DailyMetrics[] = [];
    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {},
    });
  });

  it("should calculate summary for single day with single exercise", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [
          {
            name: "Bench Press",
            weightType: "total weight",
            sets: [
              { reps: 10, weight: 100 },
              { reps: 8, weight: 110 },
              { reps: 6, weight: 120 },
            ],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Bench Press": {
          totalSets: 3,
          totalVolume: 10 * 100 + 8 * 110 + 6 * 120, // 1000 + 880 + 720 = 2600
        },
      },
    });
  });

  it("should calculate summary for multiple days with same exercise", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [
          {
            name: "Squats",
            weightType: "total weight",
            sets: [
              { reps: 12, weight: 80 },
              { reps: 10, weight: 90 },
            ],
          },
        ],
      },
      {
        date: "2025-01-03",
        metrics: {},
        exercises: [
          {
            name: "Squats",
            weightType: "total weight",
            sets: [
              { reps: 12, weight: 85 },
              { reps: 10, weight: 95 },
              { reps: 8, weight: 100 },
            ],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        Squats: {
          totalSets: 5, // 2 + 3
          totalVolume: 12 * 80 + 10 * 90 + (12 * 85 + 10 * 95 + 8 * 100), // 1860 + 2320 = 4180
        },
      },
    });
  });

  it("should handle dumbbell exercises with weight multiplication", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [
          {
            name: "Dumbbell Curls",
            weightType: "dumbbell weight",
            sets: [
              { reps: 10, weight: 15 },
              { reps: 8, weight: 15 },
            ],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Dumbbell Curls": {
          totalSets: 2,
          totalVolume: 10 * 15 * 2 + 8 * 15 * 2, // 300 + 240 = 540
        },
      },
    });
  });

  it("should handle mixed exercise types", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [
          {
            name: "Dumbbell Press",
            weightType: "dumbbell weight",
            sets: [
              { reps: 10, weight: 20 },
              { reps: 8, weight: 20 },
            ],
          },
          {
            name: "Barbell Rows",
            weightType: "total weight",
            sets: [
              { reps: 12, weight: 60 },
              { reps: 10, weight: 65 },
            ],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Dumbbell Press": {
          totalSets: 2,
          totalVolume: 10 * 20 * 2 + 8 * 20 * 2, // 400 + 320 = 720
        },
        "Barbell Rows": {
          totalSets: 2,
          totalVolume: 12 * 60 + 10 * 65, // 720 + 650 = 1370
        },
      },
    });
  });

  it("should handle days with no exercises", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [],
      },
      {
        date: "2025-01-02",
        metrics: {},
        exercises: [
          {
            name: "Push-ups",
            weightType: "total weight",
            sets: [{ reps: 15, weight: 0 }],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Push-ups": {
          totalSets: 1,
          totalVolume: 0,
        },
      },
    });
  });

  it("should handle exercises with empty sets", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        exercises: [
          {
            name: "Test Exercise",
            weightType: "total weight",
            sets: [],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Test Exercise": {
          totalSets: 0,
          totalVolume: 0,
        },
      },
    });
  });

  it("should handle days without exercises property", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        // No exercises property
      },
      {
        date: "2025-01-02",
        metrics: {},
        exercises: [
          {
            name: "Deadlift",
            weightType: "total weight",
            sets: [{ reps: 5, weight: 150 }],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        Deadlift: {
          totalSets: 1,
          totalVolume: 750,
        },
      },
    });
  });

  it("should handle complex real-world scenario", () => {
    const dailyMetrics: DailyMetrics[] = [
      {
        date: "2025-01-01",
        metrics: {},
        description: "Push Day",
        exercises: [
          {
            name: "Bench Press",
            weightType: "total weight",
            sets: [
              { reps: 10, weight: 100 },
              { reps: 8, weight: 110 },
              { reps: 6, weight: 120 },
            ],
          },
          {
            name: "Dumbbell Shoulder Press",
            weightType: "dumbbell weight",
            sets: [
              { reps: 12, weight: 25 },
              { reps: 10, weight: 25 },
            ],
          },
        ],
      },
      {
        date: "2025-01-03",
        metrics: {},
        description: "Pull Day",
        exercises: [
          {
            name: "Bench Press",
            weightType: "total weight",
            sets: [
              { reps: 10, weight: 105 },
              { reps: 8, weight: 115 },
            ],
          },
          {
            name: "Barbell Rows",
            weightType: "total weight",
            sets: [
              { reps: 12, weight: 80 },
              { reps: 10, weight: 85 },
              { reps: 8, weight: 90 },
            ],
          },
        ],
      },
    ];

    const summary = calculateTrainingSummary(dailyMetrics);

    expect(summary).toEqual({
      exercises: {
        "Bench Press": {
          totalSets: 5, // 3 + 2
          totalVolume: 10 * 100 + 8 * 110 + 6 * 120 + (10 * 105 + 8 * 115), // 2600 + 1970 = 4570
        },
        "Dumbbell Shoulder Press": {
          totalSets: 2,
          totalVolume: 12 * 25 * 2 + 10 * 25 * 2, // 600 + 500 = 1100
        },
        "Barbell Rows": {
          totalSets: 3,
          totalVolume: 12 * 80 + 10 * 85 + 8 * 90, // 960 + 850 + 720 = 2530
        },
      },
    });
  });
});
