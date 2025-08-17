import { ASLEEP_STATES, MINUTES_PER_HOUR } from "../constants/health-constants";
import { HealthRecord } from "../parsers/health-parsers";

export interface SleepMetrics {
  Core: string;
  Deep: string;
  REM: string;
  Total: string;
  wakeUps: number;
}

export class SleepCalculator {
  static calculateSleepMetrics(sleepData: HealthRecord[]): SleepMetrics | null {
    if (!sleepData?.length) return null;

    const sleepMetrics = {
      inBed: 0,
      asleepCore: 0,
      asleepDeep: 0,
      asleepREM: 0,
      awake: 0,
      wakeUps: 0,
    };

    let previousState: string | null = null;

    for (const record of sleepData) {
      const duration = record.duration || 0;
      const state = record.value as string;

      if (state in sleepMetrics) {
        sleepMetrics[state as keyof typeof sleepMetrics] += duration;
      }

      if (
        previousState &&
        ASLEEP_STATES.includes(previousState) &&
        state === "awake"
      ) {
        sleepMetrics.wakeUps++;
      }

      previousState = state;
    }

    const totalSleep =
      sleepMetrics.asleepCore +
      sleepMetrics.asleepDeep +
      sleepMetrics.asleepREM;

    return {
      Core: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepCore)),
      Deep: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepDeep)),
      REM: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepREM)),
      Total: this.formatTimeFromMinutes(Math.round(totalSleep)),
      wakeUps: sleepMetrics.wakeUps,
    };
  }

  static groupSleepDataBySession(
    data: HealthRecord[],
  ): Record<string, HealthRecord[]> {
    const sessions: Record<string, HealthRecord[]> = {};
    const sessionThreshold = 120;

    data.sort(
      (a, b) =>
        new Date(a.startDate || "").getTime() -
        new Date(b.startDate || "").getTime(),
    );

    let currentSessionStart: string | null = null;

    for (const record of data) {
      if (!record.startDate || !record.endDate) continue;

      const recordStart = new Date(record.startDate).getTime();

      if (currentSessionStart === null) {
        currentSessionStart = new Date(record.startDate)
          .toISOString()
          .split("T")[0];
        sessions[currentSessionStart] = [record];
        continue;
      }

      const lastSession = sessions[currentSessionStart];
      const lastRecord = lastSession[lastSession.length - 1];
      if (!lastRecord.endDate) continue;

      const lastEnd = new Date(lastRecord.endDate).getTime();
      const gapMinutes = (recordStart - lastEnd) / (1000 * 60);

      if (gapMinutes > sessionThreshold) {
        currentSessionStart = new Date(record.startDate)
          .toISOString()
          .split("T")[0];
        sessions[currentSessionStart] = [record];
      } else {
        lastSession.push(record);
      }
    }
    return sessions;
  }

  private static formatTimeFromMinutes(minutes: number): string {
    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const remainingMinutes = minutes % MINUTES_PER_HOUR;
    return `${hours}h ${remainingMinutes}m`;
  }
}
