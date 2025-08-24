import { StepCountFileParser } from "../../../../processors/health/parsers/step-count-file-parser";
import { CSVRecord } from "../../../../processors/health/csv-reader";

describe("StepCountFileParser", () => {
  let parser: StepCountFileParser;

  beforeEach(() => {
    parser = new StepCountFileParser();
  });

  describe("parseFile", () => {
    test("parses Zepp Life step count records correctly", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 19:50:00 +0000",
            "2025-08-23 19:59:59 +0000",
            "count",
            "15.0"
          ]
        },
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 20:30:00 +0000",
            "2025-08-23 20:39:59 +0000",
            "count",
            "75.0"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          stepCount: {
            value: 75,
            unit: "count"
          }
        }
      });
    });

    test("aggregates multiple records for same date", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 10:00:00 +0000",
            "2025-08-23 10:09:59 +0000",
            "count",
            "100"
          ]
        },
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 11:00:00 +0000",
            "2025-08-23 11:09:59 +0000",
            "count",
            "200"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: "2025-08-23",
        metrics: {
          stepCount: {
            value: 200,
            unit: "count"
          }
        }
      });
    });

    test("handles records spanning multiple dates", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 22:20:00 +0000",
            "2025-08-23 22:29:59 +0000",
            "count",
            "9.0"
          ]
        },
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-24 01:50:00 +0000",
            "2025-08-24 01:59:59 +0000",
            "count",
            "8.0"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.date === "2025-08-23")).toEqual({
        date: "2025-08-23",
        metrics: {
          stepCount: {
            value: 9,
            unit: "count"
          }
        }
      });
      expect(result.find(r => r.date === "2025-08-24")).toEqual({
        date: "2025-08-24",
        metrics: {
          stepCount: {
            value: 8,
            unit: "count"
          }
        }
      });
    });

    test("filters out non-Zepp Life sources", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "iPhone 11",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "iPhone 11",
            "18.3.2",
            "iPhone13,2",
            "<<HKDevice: 0x302212e40>, name:iPhone, manufacturer:Apple Inc., model:iPhone, hardware:iPhone13,2, software:18.3.2, creation date:2025-05-31 15:42:24 +0000>",
            "2025-08-23 20:41:09 +0000",
            "2025-08-23 20:45:01 +0000",
            "count",
            "22.0"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toEqual([]);
    });

    test("handles records with insufficient fields", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
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
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 19:50:00 +0000",
            "2025-08-23 19:59:59 +0000",
            "count",
            "15.0\r\n" // With carriage return and newline
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.stepCount as any).value).toBe(15);
    });

    test("rounds values to two decimal places", () => {
      const records: CSVRecord[] = [
        {
          type: "HKQuantityTypeIdentifierStepCount",
          sourceName: "Zepp Life",
          fields: [
            "HKQuantityTypeIdentifierStepCount",
            "Zepp Life",
            "202503131848",
            "iPhone13,2",
            "",
            "2025-08-23 19:50:00 +0000",
            "2025-08-23 19:59:59 +0000",
            "count",
            "15.666666"
          ]
        }
      ];

      const result = parser.parseFile(records);

      expect(result).toHaveLength(1);
      expect((result[0].metrics.stepCount as any).value).toBe(15.67);
    });

    test("handles empty records array", () => {
      const result = parser.parseFile([]);

      expect(result).toEqual([]);
    });
  });
});