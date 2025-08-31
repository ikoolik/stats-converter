/**
 * Shared types for data processors
 */
import { FormattedExercise } from "./processors/training";

export interface DailyMetrics {
  date: string;
  metrics: Record<string, unknown>;
  exercises?: FormattedExercise[];
  description?: string;
}

export interface WeeklyMetrics {
  week: string;
  totalDays: number;
  days: DailyMetrics[];
  summary: string | Record<string, unknown>;
}
