import { BodyMassFileParser } from "../../../../processors/health/parsers/body-mass-file-parser";
import { CSVRecord } from "../../../../processors/health/parsers/base";

describe("BodyMassFileParser", () => {
  let parser: BodyMassFileParser;

  beforeEach(() => {
    parser = new BodyMassFileParser();
  });

  describe("parseFile", () => {
    test("parses Zepp Life body mass records correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "89.05000305175781",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMass: 89.05,
        },
      });
    });

    test("overwrites multiple records for same date with latest value", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "89.0",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 10:00:00 +0000",
            "2025-08-23 10:00:00 +0000",
            "kg",
            "89.25",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMass: 89.25,
        },
      });
    });

    test("handles records spanning multiple dates", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "89.05000305175781",
          ],
        },
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-24 04:43:49 +0000",
            "2025-08-24 04:43:49 +0000",
            "kg",
            "89.44999694824219",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.date === "2025-08-23")).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMass: 89.05,
        },
      });
      expect(result.find((r) => r.date === "2025-08-24")).toEqual({
        date: "2025-08-24",
        metrics: {
          bodyMass: 89.45,
        },
      });
    });

    test("handles records with insufficient fields", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
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
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "89.25\r\n", // With carriage return and newline
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.bodyMass).toBe(89.25);
    });

    test("rounds values to two decimal places", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "kg",
            "89.333333333",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.bodyMass).toBe(89.33);
    });

    test("handles precise decimal values from real data", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-20 05:04:37 +0000",
            "2025-08-20 05:04:37 +0000",
            "kg",
            "88.55000305175781",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.bodyMass).toBe(88.55);
    });

    test("handles whole number values", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMass",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMass",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-18 04:40:36 +0000",
            "2025-08-18 04:40:36 +0000",
            "kg",
            "89.0",
          ],
        },
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0].metrics.bodyMass).toBe(89);
    });

    test("handles empty records array", () => {
      const result = parser.parseFile([]);

      expect(result).toEqual([]);
    });
  });
});
