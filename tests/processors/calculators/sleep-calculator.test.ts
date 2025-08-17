import { SleepCalculator } from "../../../processors/calculators/sleep-calculator";
import { HealthRecord } from "../../../processors/parsers/health-parsers";

describe("SleepCalculator", () => {
  describe("calculateSleepMetrics", () => {
    test("returns null for empty data", () => {
      expect(SleepCalculator.calculateSleepMetrics([])).toBeNull();
    });

    test("calculates sleep metrics correctly", () => {
      const sleepData: HealthRecord[] = [
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepCore",
          duration: 300,
          startDate: "2025-08-17T22:00:00Z",
          endDate: "2025-08-17T27:00:00Z",
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepDeep",
          duration: 90,
          startDate: "2025-08-17T27:00:00Z",
          endDate: "2025-08-17T28:30:00Z",
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepREM",
          duration: 60,
          startDate: "2025-08-17T28:30:00Z",
          endDate: "2025-08-17T29:30:00Z",
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "awake",
          duration: 10,
          startDate: "2025-08-17T29:30:00Z",
          endDate: "2025-08-17T29:40:00Z",
        },
      ];

      const result = SleepCalculator.calculateSleepMetrics(sleepData);

      expect(result).toEqual({
        Core: "5h 0m",
        Deep: "1h 30m",
        REM: "1h 0m",
        Total: "7h 30m",
        wakeUps: 1,
      });
    });

    test("counts wake-ups correctly", () => {
      const sleepData: HealthRecord[] = [
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepCore",
          duration: 60,
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "awake",
          duration: 5,
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepDeep",
          duration: 30,
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "awake",
          duration: 5,
        },
      ];

      const result = SleepCalculator.calculateSleepMetrics(sleepData);

      expect(result?.wakeUps).toBe(2);
    });
  });

  describe("groupSleepDataBySession", () => {
    test("groups sleep data by session based on time gaps", () => {
      const sleepData: HealthRecord[] = [
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepCore",
          duration: 60,
          startDate: "2025-08-17T22:00:00Z",
          endDate: "2025-08-17T23:00:00Z",
        },
        {
          date: "2025-08-17",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepDeep",
          duration: 30,
          startDate: "2025-08-17T23:00:00Z",
          endDate: "2025-08-17T23:30:00Z",
        },
        {
          date: "2025-08-18",
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          value: "asleepCore",
          duration: 90,
          startDate: "2025-08-18T22:00:00Z",
          endDate: "2025-08-18T23:30:00Z",
        },
      ];

      const result = SleepCalculator.groupSleepDataBySession(sleepData);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["2025-08-17"]).toHaveLength(2);
      expect(result["2025-08-18"]).toHaveLength(1);
    });

    test("handles empty data", () => {
      const result = SleepCalculator.groupSleepDataBySession([]);
      expect(result).toEqual({});
    });
  });
});
