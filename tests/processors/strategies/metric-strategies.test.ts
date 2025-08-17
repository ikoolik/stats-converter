import {
  BodyCompositionProcessor,
  GenericQuantityProcessor,
  DerivedMetricsProcessor,
} from "../../../processors/strategies/metric-strategies";
import { DailyMetrics } from "../../../types";

describe("Metric Strategies", () => {
  describe("BodyCompositionProcessor", () => {
    test("processes body composition metrics", () => {
      const processor = new BodyCompositionProcessor();
      const groupedData = {
        "2025-08-17": {
          HKQuantityTypeIdentifierBodyMass: [
            { date: "2025-08-17", type: "BodyMass", value: 75.5 },
          ],
          HKQuantityTypeIdentifierBodyFatPercentage: [
            { date: "2025-08-17", type: "BodyFat", value: 15 },
          ],
        },
      };
      const combined: Record<string, DailyMetrics> = {};

      processor.processMetrics(groupedData, combined);

      expect(combined["2025-08-17"]).toEqual({
        date: "2025-08-17",
        metrics: {
          BodyMass: 75.5,
          BodyFatPercentage: 15,
        },
      });
    });
  });

  describe("GenericQuantityProcessor", () => {
    test("processes generic quantity metrics", () => {
      const mockCalculateValue = jest.fn().mockReturnValue(12500);
      const processor = new GenericQuantityProcessor(
        "HKQuantityTypeIdentifierStepCount",
        "StepCount",
        mockCalculateValue,
      );

      const groupedData = {
        "2025-08-17": {
          HKQuantityTypeIdentifierStepCount: [
            { date: "2025-08-17", type: "StepCount", value: 5000 },
            { date: "2025-08-17", type: "StepCount", value: 7500 },
          ],
        },
      };
      const combined: Record<string, DailyMetrics> = {};

      processor.processMetrics(groupedData, combined);

      expect(mockCalculateValue).toHaveBeenCalledWith([
        { date: "2025-08-17", type: "StepCount", value: 5000 },
        { date: "2025-08-17", type: "StepCount", value: 7500 },
      ]);
      expect(combined["2025-08-17"]).toEqual({
        date: "2025-08-17",
        metrics: {
          StepCount: 12500,
        },
      });
    });

    test("skips processing when calculate value returns null", () => {
      const mockCalculateValue = jest.fn().mockReturnValue(null);
      const processor = new GenericQuantityProcessor(
        "HKQuantityTypeIdentifierHeartRate",
        "HeartRate",
        mockCalculateValue,
      );

      const groupedData = {
        "2025-08-17": {
          HKQuantityTypeIdentifierHeartRate: [],
        },
      };
      const combined: Record<string, DailyMetrics> = {};

      processor.processMetrics(groupedData, combined);

      expect(combined).toEqual({});
    });
  });

  describe("DerivedMetricsProcessor", () => {
    test("calculates derived metrics when all required data is present", () => {
      const mockCalculateHeight = jest.fn().mockReturnValue(1.75);
      const mockCalculateFFMI = jest.fn().mockReturnValue(20);
      const mockCalculateBCI = jest.fn().mockReturnValue(17);
      const mockRound = jest
        .fn()
        .mockImplementation((x) => Math.round(x * 100) / 100);

      const processor = new DerivedMetricsProcessor(
        mockCalculateHeight,
        mockCalculateFFMI,
        mockCalculateBCI,
        mockRound,
      );

      const combined: Record<string, DailyMetrics> = {
        "2025-08-17": {
          date: "2025-08-17",
          metrics: {
            BodyMass: 75,
            BodyMassIndex: 24.49,
            LeanBodyMass: 60,
            BodyFatPercentage: 15,
          },
        },
      };

      processor.processMetrics({}, combined);

      expect(mockCalculateHeight).toHaveBeenCalledWith(75, 24.49);
      expect(mockCalculateFFMI).toHaveBeenCalledWith(60, 1.75);
      expect(mockCalculateBCI).toHaveBeenCalledWith(20, 0.15);
      expect(combined["2025-08-17"].metrics!["FFMI"]).toBe(20);
      expect(combined["2025-08-17"].metrics!["BCI"]).toBe(17);
    });

    test("skips calculation when required data is missing", () => {
      const mockCalculateHeight = jest.fn();
      const mockCalculateFFMI = jest.fn();
      const mockCalculateBCI = jest.fn();
      const mockRound = jest.fn();

      const processor = new DerivedMetricsProcessor(
        mockCalculateHeight,
        mockCalculateFFMI,
        mockCalculateBCI,
        mockRound,
      );

      const combined: Record<string, DailyMetrics> = {
        "2025-08-17": {
          date: "2025-08-17",
          metrics: {
            BodyMass: 75,
            // Missing BodyMassIndex, LeanBodyMass, BodyFatPercentage
          },
        },
      };

      processor.processMetrics({}, combined);

      expect(mockCalculateHeight).not.toHaveBeenCalled();
      expect(mockCalculateFFMI).not.toHaveBeenCalled();
      expect(mockCalculateBCI).not.toHaveBeenCalled();
    });
  });
});
