/**
 * Shared types for data processors
 */

export interface DailyMetrics {
    date: string;
    metrics?: Record<string, any>;
    exercises?: any[];
    description?: string;
}

export interface WeeklyMetrics {
    week: string;
    totalDays: number;
    days: DailyMetrics[];
}
