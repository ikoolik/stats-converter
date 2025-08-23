import { ParserUtils } from "../../../processors/health/parsers/parser-utils";
import * as fs from "fs";
import * as path from "path";

describe("ParserUtils", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, "test-data");
    tempFile = path.join(tempDir, "test.txt");

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("extractDate", () => {
    test("extracts date from ISO datetime string", () => {
      const dateString = "2025-08-17 10:30:00 +0000";
      const result = ParserUtils.extractDate(dateString);
      expect(result).toBe("2025-08-17");
    });

    test("handles date-only string", () => {
      const dateString = "2025-08-17";
      const result = ParserUtils.extractDate(dateString);
      expect(result).toBe("2025-08-17");
    });

    test("handles T-separated datetime string", () => {
      const dateString = "2025-08-17T10:30:00Z";
      const result = ParserUtils.extractDate(dateString);
      expect(result).toBe("2025-08-17T10:30:00Z");
    });
  });

  describe("roundToTwoDecimals", () => {
    test("rounds to two decimal places", () => {
      expect(ParserUtils.roundToTwoDecimals(3.14159)).toBe(3.14);
      expect(ParserUtils.roundToTwoDecimals(2.999)).toBe(3);
      expect(ParserUtils.roundToTwoDecimals(10)).toBe(10);
      expect(ParserUtils.roundToTwoDecimals(10.5)).toBe(10.5);
    });

    test("handles negative numbers", () => {
      expect(ParserUtils.roundToTwoDecimals(-3.14159)).toBe(-3.14);
      expect(ParserUtils.roundToTwoDecimals(-2.999)).toBe(-3);
    });

    test("handles very small numbers", () => {
      expect(ParserUtils.roundToTwoDecimals(0.001)).toBe(0);
      expect(ParserUtils.roundToTwoDecimals(0.005)).toBe(0.01);
    });
  });

  describe("loadTextFile", () => {
    test("loads text file contents", () => {
      const testContent = "Hello, world!\nSecond line.";
      fs.writeFileSync(tempFile, testContent);

      const result = ParserUtils.loadTextFile(tempFile);
      expect(result).toBe(testContent);
    });

    test("throws error for non-existent file", () => {
      const nonExistentFile = path.join(tempDir, "nonexistent.txt");
      expect(() => ParserUtils.loadTextFile(nonExistentFile)).toThrow();
    });
  });

  describe("parseCSVLine", () => {
    test("parses simple CSV line", () => {
      const csvLine = "value1,value2,value3";
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["value1", "value2", "value3"]);
    });

    test("parses CSV line with quoted values", () => {
      const csvLine = '"quoted value","another quoted","simple"';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["quoted value", "another quoted", "simple"]);
    });

    test("parses CSV line with quoted values containing commas", () => {
      const csvLine =
        '"value, with comma","normal value","another, comma value"';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual([
        "value, with comma",
        "normal value",
        "another, comma value",
      ]);
    });

    test("handles mixed quoted and unquoted values", () => {
      const csvLine = 'unquoted,"quoted value",another_unquoted';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["unquoted", "quoted value", "another_unquoted"]);
    });

    test("handles empty values", () => {
      const csvLine = "value1,,value3";
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["value1", "", "value3"]);
    });

    test("handles quoted empty values", () => {
      const csvLine = 'value1,"",value3';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["value1", "", "value3"]);
    });

    test("handles line ending with quoted value", () => {
      const csvLine = 'value1,value2,"final quoted value"';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["value1", "value2", "final quoted value"]);
    });

    test("handles single quoted value", () => {
      const csvLine = '"single quoted value"';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual(["single quoted value"]);
    });

    test("handles complex health export CSV format", () => {
      const csvLine =
        '"HKQuantityTypeIdentifierBodyMass","Health","1.0","iPhone","kg","2025-08-17 08:00:00 +0000","2025-08-17 07:00:00 +0000","2025-08-17 07:00:00 +0000","75.5"';
      const result = ParserUtils.parseCSVLine(csvLine);
      expect(result).toEqual([
        "HKQuantityTypeIdentifierBodyMass",
        "Health",
        "1.0",
        "iPhone",
        "kg",
        "2025-08-17 08:00:00 +0000",
        "2025-08-17 07:00:00 +0000",
        "2025-08-17 07:00:00 +0000",
        "75.5",
      ]);
    });
  });
});
