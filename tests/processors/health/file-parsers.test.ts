import * as fs from "fs";
import * as path from "path";
import { HealthCSVParser } from "../../../processors/health/parsers/health-csv-parser";

describe("Health File Parsers", () => {
  let parser: HealthCSVParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new HealthCSVParser();
    tempDir = path.join(__dirname, "test-data");

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("HealthCSVParser", () => {
    test("getName returns correct parser name", () => {
      expect(parser.getName()).toBe("HealthCSV");
    });

    test("getSupportedFiles returns HK CSV files", () => {
      // Create test HK files
      const testFiles = [
        "HKSleepAnalysis.csv",
        "HKBodyMass.csv",
        "HKStepCount.csv",
        "regular-file.csv", // Should be ignored
        "HKHeartRate.csv",
      ];

      testFiles.forEach((filename) => {
        fs.writeFileSync(path.join(tempDir, filename), "test content");
      });

      const supportedFiles = parser.getSupportedFiles(tempDir);
      const filenames = supportedFiles.map((f) => path.basename(f));

      expect(filenames).toContain("HKSleepAnalysis.csv");
      expect(filenames).toContain("HKBodyMass.csv");
      expect(filenames).toContain("HKStepCount.csv");
      expect(filenames).toContain("HKHeartRate.csv");
      expect(filenames).not.toContain("regular-file.csv");
    });

    test("getSupportedFiles handles non-existent directory gracefully", () => {
      const nonExistentDir = "/non/existent/directory";
      const supportedFiles = parser.getSupportedFiles(nonExistentDir);
      expect(supportedFiles).toEqual([]);
    });

    test("getSupportedFiles warns when no HK files found", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Create directory with no HK files
      fs.writeFileSync(path.join(tempDir, "regular.csv"), "content");

      const supportedFiles = parser.getSupportedFiles(tempDir);

      expect(supportedFiles).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No HK*.csv files found"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Sleep Analysis File Type", () => {
    test("parseFile handles HKSleepAnalysis.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKCategoryTypeIdentifierSleepAnalysis","Apple Watch","7.0","Apple Watch Series 6","","2025-08-17 08:00:00 +0000","2025-08-16 22:30:00 +0000","2025-08-16 23:00:00 +0000","asleepCore"',
        '"HKCategoryTypeIdentifierSleepAnalysis","Apple Watch","7.0","Apple Watch Series 6","","2025-08-17 08:00:00 +0000","2025-08-16 23:00:00 +0000","2025-08-17 06:30:00 +0000","asleepDeep"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKSleepAnalysis.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: expect.objectContaining({
          Sleep: expect.any(Object),
        }),
      });
    });

    test("parseFile handles empty sleep analysis file", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKSleepAnalysis.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);
      expect(result).toEqual([]);
    });
  });

  describe("Step Count File Type", () => {
    test("parseFile handles HKStepCount.csv format from Zepp Life", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierStepCount","Zepp Life","1.0","Zepp Band 5","count","2025-08-17 08:00:00 +0000","2025-08-17 00:00:00 +0000","2025-08-17 23:59:59 +0000","8542"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKStepCount.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          StepCount: 8542,
        },
      });
    });

    test("parseFile ignores step count from non-Zepp Life sources", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierStepCount","iPhone","14.0","iPhone 13","count","2025-08-17 08:00:00 +0000","2025-08-17 00:00:00 +0000","2025-08-17 23:59:59 +0000","5000"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKStepCount.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);
      expect(result).toEqual([]);
    });
  });

  describe("Body Metrics File Types", () => {
    test("parseFile handles HKBodyMass.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierBodyMass","Health","1.0","iPhone","kg","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","75.5"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKBodyMass.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          BodyMass: 75.5,
        },
      });
    });

    test("parseFile handles HKBodyFatPercentage.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierBodyFatPercentage","Health","1.0","iPhone","%","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","0.15"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKBodyFatPercentage.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          BodyFatPercentage: 15, // Converted from 0.15 to 15%
        },
      });
    });

    test("parseFile handles HKLeanBodyMass.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierLeanBodyMass","Health","1.0","iPhone","kg","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","64.2"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKLeanBodyMass.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          LeanBodyMass: 64.2,
        },
      });
    });

    test("parseFile handles HKBodyMassIndex.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierBodyMassIndex","Health","1.0","iPhone","count","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","24.2"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKBodyMassIndex.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          BodyMassIndex: 24.2,
        },
      });
    });
  });

  describe("Heart Rate File Type", () => {
    test("parseFile handles HKHeartRate.csv format", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierHeartRate","Apple Watch","7.0","Apple Watch Series 6","count/min","2025-08-17 08:00:00 +0000","2025-08-17 08:00:00 +0000","2025-08-17 08:00:00 +0000","72"',
        '"HKQuantityTypeIdentifierHeartRate","Apple Watch","7.0","Apple Watch Series 6","count/min","2025-08-17 09:00:00 +0000","2025-08-17 09:00:00 +0000","2025-08-17 09:00:00 +0000","85"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKHeartRate.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: {
          HeartRate: expect.any(Number), // Average of heart rate readings
        },
      });
    });
  });

  describe("Error Handling", () => {
    test("parseFile handles corrupted CSV gracefully", () => {
      const corruptedContent = "corrupted,csv,data\nwith,invalid,structure";
      const filePath = path.join(tempDir, "HKCorrupted.csv");
      fs.writeFileSync(filePath, corruptedContent);

      const result = parser.parseFile(filePath);

      expect(result).toEqual([]);
    });

    test("parseFile handles non-existent file gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const nonExistentFile = path.join(tempDir, "NonExistent.csv");
      const result = parser.parseFile(nonExistentFile);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Combined File Processing", () => {
    test("parseFile processes multiple health metrics from single file", () => {
      const csvContent = [
        "sep=,",
        '"type","sourceName","sourceVersion","device","unit","creationDate","startDate","endDate","value"',
        '"HKQuantityTypeIdentifierBodyMass","Health","1.0","iPhone","kg","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","75.5"',
        '"HKQuantityTypeIdentifierBodyFatPercentage","Health","1.0","iPhone","%","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","0.15"',
        '"HKQuantityTypeIdentifierLeanBodyMass","Health","1.0","iPhone","kg","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","64.2"',
        '"HKQuantityTypeIdentifierHeight","Health","1.0","iPhone","cm","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","180"',
      ].join("\n");

      const filePath = path.join(tempDir, "HKMultipleMetrics.csv");
      fs.writeFileSync(filePath, csvContent);

      const result = parser.parseFile(filePath);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: "2025-08-17",
        metrics: expect.objectContaining({
          BodyMass: 75.5,
          BodyFatPercentage: 15,
          LeanBodyMass: 64.2,
        }),
      });

      // Verify we have all expected metrics
      expect(Object.keys(result[0].metrics)).toEqual(
        expect.arrayContaining([
          "BodyMass",
          "BodyFatPercentage",
          "LeanBodyMass",
        ]),
      );
    });
  });
});
