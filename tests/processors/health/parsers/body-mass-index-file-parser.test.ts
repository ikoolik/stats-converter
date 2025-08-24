import { BodyMassIndexFileParser } from "../../../../processors/health/parsers/body-mass-index-file-parser";
import { CSVRecord } from "../../../../processors/health/csv-reader";

describe("BodyMassIndexFileParser", () => {
  let parser: BodyMassIndexFileParser;

  beforeEach(() => {
    parser = new BodyMassIndexFileParser();
  });

  describe("parseFile", () => {
    test("parses Zepp Life body mass index records correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "26.3"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMassIndex: {
            value: 26.3,
            unit: "count"
          }
        }
      });
    });

    test("overwrites multiple records for same date with latest value", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "26.2"
          ]
        },
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 10:00:00 +0000",
            "2025-08-23 10:00:00 +0000",
            "count",
            "26.4"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMassIndex: {
            value: 26.4,
            unit: "count"
          }
        }
      });
    });

    test("handles records spanning multiple dates", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "26.3"
          ]
        },
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-24 04:43:49 +0000",
            "2025-08-24 04:43:49 +0000",
            "count",
            "26.4"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.date === "2025-08-23")).toEqual({
        date: "2025-08-23",
        metrics: {
          bodyMassIndex: {
            value: 26.3,
            unit: "count"
          }
        }
      });
      expect(result.find(r => r.date === "2025-08-24")).toEqual({
        date: "2025-08-24",
        metrics: {
          bodyMassIndex: {
            value: 26.4,
            unit: "count"
          }
        }
      });
    });

    test("handles records with insufficient fields", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848"
          ] // Only 3 fields, needs at least 9
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toEqual([]);
    });

    test("trims and cleans value field", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "26.3\r\n" // With carriage return and newline
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyMassIndex as any).value).toBe(26.3);
    });

    test("rounds values to two decimal places", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "26.36666666"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyMassIndex as any).value).toBe(26.37);
    });

    test("handles decimal BMI values correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierBodyMassIndex",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierBodyMassIndex",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 04:53:08 +0000",
            "2025-08-23 04:53:08 +0000",
            "count",
            "22.15"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.bodyMassIndex as any).value).toBe(22.15);
    });

    test("handles empty records array", () => {
      const result = parser.parseFile([]);

      expect(result).toEqual([]);
    });
  });
});