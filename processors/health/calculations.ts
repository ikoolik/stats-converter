import { HealthRecord } from "./parsers";

export function calculateHeight(bodyMass: number, bmi: number): number {
  return Math.sqrt(bodyMass / bmi);
}

export function calculateFFMI(leanBodyMass: number, height: number): number {
  return leanBodyMass / (height * height);
}

export function calculateBCI(ffmi: number, bodyFatPercentage: number): number {
  return ffmi * (1 - bodyFatPercentage);
}

export function calculateAverageHeartRate(
  heartRateData: HealthRecord[],
  roundToTwoDecimals: (value: number) => number,
): number | null {
  if (!heartRateData || heartRateData.length === 0) {
    return null;
  }

  const sum = heartRateData.reduce(
    (acc, record) => acc + (record.value as number),
    0,
  );
  return roundToTwoDecimals(sum / heartRateData.length);
}

export function calculateTotalSteps(stepData: HealthRecord[]): number | null {
  if (!stepData || stepData.length === 0) {
    return null;
  }

  const total = stepData.reduce(
    (acc, record) => acc + (record.value as number),
    0,
  );
  return Math.round(total);
}
