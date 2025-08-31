import { LeanBodyMassFileParser } from "../../../../processors/health/parsers/lean-body-mass-file-parser";
import { CSVRecord } from "../../../../processors/health/parsers/base";

describe("LeanBodyMassFileParser", () => {
  let parser: LeanBodyMassFileParser;

  beforeEach(() => {
    parser = new LeanBodyMassFileParser();
  });

  describe("parseFile", () => {
    test("parses Zepp Life lean body mass records correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "65.6",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          leanBodyMass: 65.6,
        },
      });
    });

    test("overwrites multiple records for same date with latest value", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "65.5",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 10:00:00 +0000",
            "2025-08-23 10:00:00 +0000",
            "kg",
            "65.8",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          leanBodyMass: 65.8,
        },
      });
    });

    test("handles records spanning multiple dates", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "65.6",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-24 04:43:49 +0000",
            "2025-08-24 04:43:49 +0000",
            "kg",
            "65.8",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.date === "2025-08-23")).toEqual({
        date: "2025-08-23",
        metrics: {
          leanBodyMass: 65.6,
        },
      });
      expect(result.find((r) => r.date === "2025-08-24")).toEqual({
        date: "2025-08-24",
        metrics: {
          leanBodyMass: 65.8,
        },
      });
    });

    test("handles records with insufficient fields", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
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
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "65.6\r\n", // With carriage return and newline
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.leanBodyMass).toBe(65.6);
    });

    test("rounds values to two decimal places", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierLeanBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierLeanBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "65.666666",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.leanBodyMass).toBe(65.67);
    });

    test("handles empty records array", () => {
      const result = parser.parseFile([]);

      expect(result).toEqual([]);
    });
  });
});
