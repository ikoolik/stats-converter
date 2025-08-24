import { DailyMetrics } from "../../types";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface ExerciseDetail {
  totalSets: number;
  totalVolume: number;
}

interface TrainingSummary extends Record<string, unknown> {
  exercises: Record<string, ExerciseDetail>;
}

/**
 * Calculate training summary for a week
 * @param dailyMetrics - Array of daily metrics for the week
 * @returns Training summary object
 */
export function calculateTrainingSummary(
  dailyMetrics: DailyMetrics[],
): TrainingSummary {
  const exerciseSummaries: Record<string, ExerciseDetail> = {};

  // Process each day's exercises
  dailyMetrics.forEach((day) => {
    if (day.exercises && Array.isArray(day.exercises)) {
      day.exercises.forEach((exercise: unknown) => {
        const exerciseName = (exercise as { name: string }).name;

        // Initialize exercise detail if it doesn't exist
        if (!exerciseSummaries[exerciseName]) {
          exerciseSummaries[exerciseName] = {
            totalSets: 0,
            totalVolume: 0,
          };
        }

        // Process sets for this exercise
        const exerciseSets = (exercise as { sets?: ExerciseSet[] }).sets;
        if (exerciseSets && Array.isArray(exerciseSets)) {
          exerciseSummaries[exerciseName].totalSets += exerciseSets.length;

          // Calculate total volume (reps × weight for each set)
          exerciseSets.forEach((set) => {
            if (set.reps && set.weight) {
              exerciseSummaries[exerciseName].totalVolume +=
                set.reps * set.weight;
            }
          });
        }
      });
    }
  });

  return {
    exercises: exerciseSummaries,
  };
}
