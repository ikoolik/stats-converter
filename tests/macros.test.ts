import * as fs from "fs";
import * as path from "path";
import { MacrosProcessor } from "../processors/macros";

// Mock fs to avoid file system dependencies
jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("MacrosProcessor", () => {
  let processor: MacrosProcessor;
  let mockSourcesDir: string;

  beforeEach(() => {
    processor = new MacrosProcessor();
    // Access private properties for testing
    mockSourcesDir = (processor as MacrosProcessor & { sourcesDir: string })
      .sourcesDir;
    path.join(mockSourcesDir, "chart.csv");

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("date processing", () => {
    test("should extract date from datetime with 00:00:00", () => {
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 00:00:00",0,36,160,120,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();

      expect(result[0].days[0].date).toBe("2024-01-01");
    });

    test("should extract date from datetime with 23:59:59", () => {
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 23:59:59",0,36,160,120,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();

      expect(result[0].days[0].date).toBe("2024-01-01");
    });

    test("should handle multiple dates correctly", () => {
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 00:00:00",0,36,160,120,
"2024-01-01 23:59:59",0,45,180,140,
"2024-01-02 12:30:45",0,54,200,160,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();

      expect(result[0].days[0].date).toBe("2024-01-01");
      expect(result[0].days[1].date).toBe("2024-01-01");
      expect(result[0].days[2].date).toBe("2024-01-02");
    });
  });

  describe("conversion calculations", () => {
    test("should convert calories to grams correctly", () => {
      // Fat: 36 kcal / 9 = 4g
      // Carbs: 160 kcal / 4 = 40g
      // Protein: 120 kcal / 4 = 30g
      // Total: 36 + 160 + 120 = 316 kcal
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 00:00:00",0,36,160,120,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();
      const dayMetrics = result[0]?.days[0]?.metrics;

      expect(dayMetrics).toBeDefined();
      expect(dayMetrics!.fat).toBe(4);
      expect(dayMetrics!.carbs).toBe(40);
      expect(dayMetrics!.protein).toBe(30);
      expect(dayMetrics!.totalKcal).toBe(316);
    });

    test("should handle decimal values and round to two places", () => {
      // Fat: 37 kcal / 9 = 4.11g
      // Carbs: 161 kcal / 4 = 40.25g
      // Protein: 121 kcal / 4 = 30.25g
      // Total: 37 + 161 + 121 = 319 kcal
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 00:00:00",0,37,161,121,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();
      const dayMetrics = result[0]?.days[0]?.metrics;

      expect(dayMetrics).toBeDefined();
      expect(dayMetrics!.fat).toBe(4.11);
      expect(dayMetrics!.carbs).toBe(40.25);
      expect(dayMetrics!.protein).toBe(30.25);
      expect(dayMetrics!.totalKcal).toBe(319);
    });

    test("should handle zero values", () => {
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"
"2024-01-01 00:00:00",0,0,0,0,`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();
      const dayMetrics = result[0]?.days[0]?.metrics;

      expect(dayMetrics).toBeDefined();
      expect(dayMetrics!.fat).toBe(0);
      expect(dayMetrics!.carbs).toBe(0);
      expect(dayMetrics!.protein).toBe(0);
      expect(dayMetrics!.totalKcal).toBe(0);
    });
  });

  describe("error handling", () => {
    test("should throw error when chart.csv does not exist", () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => processor.process()).toThrow("chart.csv file not found");
    });

    test("should handle empty CSV gracefully", () => {
      const csvContent = `"DateTime","Alcohol","Fat","Carbs","Protein","Fasting"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(csvContent);

      const result = processor.process();

      expect(result).toEqual([]);
    });
  });
});
