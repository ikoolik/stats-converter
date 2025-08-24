import { DailyMetrics } from "../../types";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface ExerciseDetail {
  set: number;
  weights: number[];
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
            set: 0,
            weights: [],
          };
        }

        // Process sets for this exercise
        const exerciseSets = (exercise as { sets?: ExerciseSet[] }).sets;
        if (exerciseSets && Array.isArray(exerciseSets)) {
          exerciseSummaries[exerciseName].set += exerciseSets.length;

          // Collect unique weights
          exerciseSets.forEach((set) => {
            if (
              set.weight &&
              !exerciseSummaries[exerciseName].weights.includes(set.weight)
            ) {
              exerciseSummaries[exerciseName].weights.push(set.weight);
            }
          });

          // Sort weights for consistent output
          exerciseSummaries[exerciseName].weights.sort((a, b) => a - b);
        }
      });
    }
  });

  return {
    exercises: exerciseSummaries,
  };
}
