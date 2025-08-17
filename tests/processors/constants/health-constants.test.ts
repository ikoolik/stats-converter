import {
  MILLISECONDS_PER_MINUTE,
  SLEEP_SESSION_GAP_THRESHOLD_MS,
  BODY_METRICS,
  ASLEEP_STATES,
  MINUTES_PER_HOUR,
} from "../../../processors/constants/health-constants";

describe("Health Constants", () => {
  test("MILLISECONDS_PER_MINUTE should be 60000", () => {
    expect(MILLISECONDS_PER_MINUTE).toBe(60000);
  });

  test("SLEEP_SESSION_GAP_THRESHOLD_MS should be 1800000 (30 minutes)", () => {
    expect(SLEEP_SESSION_GAP_THRESHOLD_MS).toBe(1800000);
  });

  test("MINUTES_PER_HOUR should be 60", () => {
    expect(MINUTES_PER_HOUR).toBe(60);
  });

  test("BODY_METRICS should contain expected HealthKit identifiers", () => {
    expect(BODY_METRICS).toEqual([
      "HKQuantityTypeIdentifierBodyFatPercentage",
      "HKQuantityTypeIdentifierBodyMass",
      "HKQuantityTypeIdentifierBodyMassIndex",
      "HKQuantityTypeIdentifierLeanBodyMass",
    ]);
  });

  test("ASLEEP_STATES should contain sleep state identifiers", () => {
    expect(ASLEEP_STATES).toEqual(["asleepCore", "asleepDeep", "asleepREM"]);
  });
});
