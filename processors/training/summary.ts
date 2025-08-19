import { DailyMetrics } from "../../types";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface ExerciseSummary {
  totalSets: number;
  totalVolume: number;
}

interface TrainingSummary extends Record<string, unknown> {
  exercises: Record<string, ExerciseSummary>;
}

/**
 * Calculate training summary for a week
 * @param dailyMetrics - Array of daily metrics for the week
 * @returns Training summary object
 */
export function calculateTrainingSummary(
  dailyMetrics: DailyMetrics[],
): TrainingSummary {
  const exerciseSummaries: Record<string, ExerciseSummary> = {};

  // Process each day's exercises
  dailyMetrics.forEach((day) => {
    if (day.exercises && Array.isArray(day.exercises)) {
      day.exercises.forEach((exercise: unknown) => {
        const exerciseName = (exercise as { name: string }).name;
        const weightType = (exercise as { weightType: string }).weightType;

        // Initialize exercise summary if it doesn't exist
        if (!exerciseSummaries[exerciseName]) {
          exerciseSummaries[exerciseName] = {
            totalSets: 0,
            totalVolume: 0,
          };
        }

        // Count sets and calculate volume for this exercise
        const exerciseSets = (exercise as { sets?: ExerciseSet[] }).sets;
        if (exerciseSets && Array.isArray(exerciseSets)) {
          exerciseSets.forEach((set: ExerciseSet) => {
            exerciseSummaries[exerciseName].totalSets += 1;

            // Calculate volume: reps × weight
            let volume = set.reps * set.weight;

            // Multiply by 2 for dumbbell exercises (since we're using single dumbbell weight)
            if (weightType === "dumbbell weight") {
              volume *= 2;
            }

            exerciseSummaries[exerciseName].totalVolume += volume;
          });
        }
      });
    }
  });

  return {
    exercises: exerciseSummaries,
  };
}
