import { BodyFatFileParser } from "../../../../processors/health/parsers/body-fat-file-parser";
import { CSVRecord } from "../../../../processors/health/parsers/base";

describe("BodyFatFileParser", () => {
  let parser: BodyFatFileParser;

  beforeEach(() => {
    parser = new BodyFatFileParser();
  });

  describe("parseFile", () => {
    test("parses Zepp Life body fat percentage records correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.263",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyFatPercentage: {
            value: 26.3,
            unit: "%",
          },
        },
      });
    });

    test("converts decimal to percentage correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.15",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyFatPercentage: {
            value: 15,
            unit: "%",
          },
        },
      });
    });

    test("overwrites multiple records for same date with latest value", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.26",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 10:00:00 +0000",
            "2025-08-23 10:00:00 +0000",
            "%",
            "0.264",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyFatPercentage: {
            value: 26.4,
            unit: "%",
          },
        },
      });
    });

    test("handles records spanning multiple dates", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.263",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-24 04:43:49 +0000",
            "2025-08-24 04:43:49 +0000",
            "%",
            "0.264",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.date === "2025-08-23")).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyFatPercentage: {
            value: 26.3,
            unit: "%",
          },
        },
      });
      expect(result.find((r) => r.date === "2025-08-24")).toEqual({
        date: "2025-08-24",
        metrics: {
          bodyFatPercentage: {
            value: 26.4,
            unit: "%",
          },
        },
      });
    });

    test("handles records with insufficient fields", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
          ], // Only 3 fields, needs at least 9
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toEqual([]);
    });

    test("trims and cleans value field", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.263\r\n", // With carriage return and newline
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyFatPercentage as any).value).toBe(26.3);
    });

    test("rounds values to two decimal places", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.26666666",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyFatPercentage as any).value).toBe(26.67);
    });

    test("handles very small decimal values", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyFatPercentage",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyFatPercentage",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "%",
            "0.05",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyFatPercentage as any).value).toBe(5);
    });

    test("handles empty records array", () => {
      const result = parser.parseFile([]);

      expect(result).toEqual([]);
    });
  });
});
