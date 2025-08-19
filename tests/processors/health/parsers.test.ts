import {
  SleepAnalysisParser,
  StepCountParser,
  BodyMetricsParser,
} from "../../../processors/health/parsers";

describe("Health Record Parsers", () => {
  const mockExtractDate = (dateString: string) => dateString.split("T")[0];
  const mockRoundToTwoDecimals = (value: number) =>
    Math.round(value * 100) / 100;

  const createMockFields = (type: string, value: string, unit = "unit") => [
    type,
    "source",
    "meta",
    "date",
    "time",
    "2025-08-17T10:00:00Z",
    "end",
    unit,
    value,
  ];

  describe("SleepAnalysisParser", () => {
    let parser: SleepAnalysisParser;

    beforeEach(() => {
      parser = new SleepAnalysisParser(mockExtractDate, mockRoundToTwoDecimals);
    });

    test("canParse returns true for sleep analysis type", () => {
      expect(parser.canParse("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
        true,
      );
    });

    test("canParse returns false for other types", () => {
      expect(parser.canParse("HKQuantityTypeIdentifierStepCount")).toBe(false);
    });

    test("parse returns valid sleep record", () => {
      const fields = [
        "HKCategoryTypeIdentifierSleepAnalysis",
        "source",
        "unit",
        "date",
        "time",
        "2025-08-17T22:00:00Z",
        "2025-08-17T23:30:00Z",
        "asleepCore",
      ];

      const result = parser.parse(fields);

      expect(result).toEqual({
        date: "2025-08-17",
        type: "HKCategoryTypeIdentifierSleepAnalysis",
        value: "asleepCore",
        duration: 90,
        startDate: "2025-08-17T22:00:00Z",
        endDate: "2025-08-17T23:30:00Z",
      });
    });

    test("parse returns null for insufficient fields", () => {
      const fields = ["HKCategoryTypeIdentifierSleepAnalysis"];
      expect(parser.parse(fields)).toBeNull();
    });
  });

  describe("StepCountParser", () => {
    let parser: StepCountParser;

    beforeEach(() => {
      parser = new StepCountParser(mockExtractDate, mockRoundToTwoDecimals);
    });

    test("canParse returns true for step count from Zepp Life", () => {
      expect(
        parser.canParse("HKQuantityTypeIdentifierStepCount", "Zepp Life"),
      ).toBe(true);
    });

    test("canParse returns false for step count from other sources", () => {
      expect(
        parser.canParse("HKQuantityTypeIdentifierStepCount", "iPhone"),
      ).toBe(false);
    });

    test("parse returns valid step record", () => {
      const fields = createMockFields(
        "HKQuantityTypeIdentifierStepCount",
        "12345",
        "count",
      );

      const result = parser.parse(fields);

      expect(result).toEqual({
        date: "2025-08-17",
        type: "HKQuantityTypeIdentifierStepCount",
        value: 12345,
        unit: "count",
      });
    });
  });

  describe("BodyMetricsParser", () => {
    let parser: BodyMetricsParser;

    beforeEach(() => {
      parser = new BodyMetricsParser(mockExtractDate, mockRoundToTwoDecimals);
    });

    test("canParse returns true for body metrics", () => {
      expect(parser.canParse("HKQuantityTypeIdentifierBodyMass")).toBe(true);
    });

    test("canParse returns false for sleep analysis", () => {
      expect(parser.canParse("HKCategoryTypeIdentifierSleepAnalysis")).toBe(
        false,
      );
    });

    test("canParse returns false for step count", () => {
      expect(parser.canParse("HKQuantityTypeIdentifierStepCount")).toBe(false);
    });

    test("parse converts body fat percentage to full percentage", () => {
      const fields = createMockFields(
        "HKQuantityTypeIdentifierBodyFatPercentage",
        "0.15",
        "%",
      );

      const result = parser.parse(fields);

      expect(result?.value).toBe(15);
    });

    test("parse handles regular body metrics", () => {
      const fields = createMockFields(
        "HKQuantityTypeIdentifierBodyMass",
        "75.5",
        "kg",
      );

      const result = parser.parse(fields);

      expect(result).toEqual({
        date: "2025-08-17",
        type: "HKQuantityTypeIdentifierBodyMass",
        value: 75.5,
        unit: "kg",
      });
    });
  });
});
