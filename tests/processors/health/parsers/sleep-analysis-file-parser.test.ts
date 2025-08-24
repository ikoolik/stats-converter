import { SleepAnalysisFileParser } from "../../../../processors/health/parsers/sleep-analysis-file-parser";
import { CSVRecord } from "../../../../processors/health/parsers/base";

describe("SleepAnalysisFileParser", () => {
  let parser: SleepAnalysisFileParser;

  beforeEach(() => {
    parser = new SleepAnalysisFileParser();
  });

  describe("parseFile", () => {
    it("should parse valid sleep analysis records", () => {
      const mockRecords: CSVRecord[] = [
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 01:00:00 +0000",
            "2025-08-24 02:00:00 +0000",
            "asleepCore",
          ],
        },
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 02:00:00 +0000",
            "2025-08-24 02:30:00 +0000",
            "asleepREM",
          ],
        },
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 02:30:00 +0000",
            "2025-08-24 06:00:00 +0000",
            "asleepCore",
          ],
        },
      ];

      const result = parser.parseFile(mockRecords);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2025-08-24");
      expect(result[0].metrics.sleep).toBeDefined();
    });

    it("should skip records with insufficient fields", () => {
      const mockRecords: CSVRecord[] = [
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
          ],
        },
      ];

      const result = parser.parseFile(mockRecords);

      expect(result).toHaveLength(0);
    });

    it("should handle records with newline characters in value field", () => {
      const mockRecords: CSVRecord[] = [
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 01:00:00 +0000",
            "2025-08-24 02:00:00 +0000",
            "asleepCore\r\n",
          ],
        },
      ];

      const result = parser.parseFile(mockRecords);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.sleep).toBeDefined();
    });

    it("should handle empty input", () => {
      const result = parser.parseFile([]);

      expect(result).toHaveLength(0);
    });

    it("should group sleep records by session and calculate metrics", () => {
      const mockRecords: CSVRecord[] = [
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 01:00:00 +0000",
            "2025-08-24 02:00:00 +0000",
            "asleepCore",
          ],
        },
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 02:00:00 +0000",
            "2025-08-24 02:30:00 +0000",
            "asleepREM",
          ],
        },
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-25 01:00:00 +0000",
            "2025-08-25 03:00:00 +0000",
            "asleepDeep",
          ],
        },
      ];

      const result = parser.parseFile(mockRecords);

      expect(result).toHaveLength(2);

      const day1 = result.find((r) => r.date === "2025-08-24");
      const day2 = result.find((r) => r.date === "2025-08-25");

      expect(day1?.metrics.sleep).toBeDefined();
      expect(day2?.metrics.sleep).toBeDefined();
    });

    it("should calculate duration correctly in minutes", () => {
      const mockRecords: CSVRecord[] = [
        {
          type: "HKCategoryTypeIdentifierSleepAnalysis",
          sourceName: "Zepp Life",
          fields: [
            "HKCategoryTypeIdentifierSleepAnalysis",
            "Zepp Life",
            "202503131848",
            '"iPhone13,2"',
            "",
            "2025-08-24 01:00:00 +0000",
            "2025-08-24 01:30:00 +0000",
            "asleepCore",
          ],
        },
      ];

      const result = parser.parseFile(mockRecords);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.sleep).toBeDefined();
    });
  });
});
