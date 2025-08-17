import {
  calculateHeight,
  calculateFFMI,
  calculateBCI,
  calculateAverageHeartRate,
  calculateTotalSteps,
} from "../../../processors/utils/health-calculations";
import { HealthRecord } from "../../../processors/parsers/health-parsers";

describe("Health Calculations", () => {
  describe("calculateHeight", () => {
    test("calculates height from body mass and BMI", () => {
      const bodyMass = 75; // kg
      const bmi = 24.22; // kg/m²
      const result = calculateHeight(bodyMass, bmi);

      expect(result).toBeCloseTo(1.76, 2);
    });
  });

  describe("calculateFFMI", () => {
    test("calculates FFMI from lean body mass and height", () => {
      const leanBodyMass = 60; // kg
      const height = 1.75; // m
      const result = calculateFFMI(leanBodyMass, height);

      expect(result).toBeCloseTo(19.59, 2);
    });
  });

  describe("calculateBCI", () => {
    test("calculates BCI from FFMI and body fat percentage", () => {
      const ffmi = 20;
      const bodyFatPercentage = 0.15; // 15%
      const result = calculateBCI(ffmi, bodyFatPercentage);

      expect(result).toBe(17);
    });
  });

  describe("calculateAverageHeartRate", () => {
    const mockRound = (value: number) => Math.round(value * 100) / 100;

    test("calculates average heart rate", () => {
      const heartRateData: HealthRecord[] = [
        { date: "2025-08-17", type: "HeartRate", value: 70 },
        { date: "2025-08-17", type: "HeartRate", value: 75 },
        { date: "2025-08-17", type: "HeartRate", value: 80 },
      ];

      const result = calculateAverageHeartRate(heartRateData, mockRound);
      expect(result).toBe(75);
    });

    test("returns null for empty data", () => {
      const result = calculateAverageHeartRate([], mockRound);
      expect(result).toBeNull();
    });

    test("returns null for null data", () => {
      const result = calculateAverageHeartRate(
        null as unknown as HealthRecord[],
        mockRound,
      );
      expect(result).toBeNull();
    });
  });

  describe("calculateTotalSteps", () => {
    test("calculates total steps", () => {
      const stepData: HealthRecord[] = [
        { date: "2025-08-17", type: "StepCount", value: 5000 },
        { date: "2025-08-17", type: "StepCount", value: 3000 },
        { date: "2025-08-17", type: "StepCount", value: 2500 },
      ];

      const result = calculateTotalSteps(stepData);
      expect(result).toBe(10500);
    });

    test("rounds to nearest integer", () => {
      const stepData: HealthRecord[] = [
        { date: "2025-08-17", type: "StepCount", value: 1000.7 },
        { date: "2025-08-17", type: "StepCount", value: 2000.3 },
      ];

      const result = calculateTotalSteps(stepData);
      expect(result).toBe(3001);
    });

    test("returns null for empty data", () => {
      const result = calculateTotalSteps([]);
      expect(result).toBeNull();
    });

    test("returns null for null data", () => {
      const result = calculateTotalSteps(null as unknown as HealthRecord[]);
      expect(result).toBeNull();
    });
  });
});
