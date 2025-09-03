import { DailyMetrics } from "../../types";

interface ExerciseDetail {
  totalSets: number;
  totalVolume: number;
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
      day.exercises.forEach((exercise) => {
        const exerciseName = exercise.name;

        // Initialize exercise detail if it doesn't exist
        if (!exerciseSummaries[exerciseName]) {
          exerciseSummaries[exerciseName] = {
            totalSets: 0,
            totalVolume: 0,
            weights: [],
          };
        }

        // Process sets for this exercise
        const exerciseSets = exercise.sets;
        if (exerciseSets && Array.isArray(exerciseSets)) {
          exerciseSummaries[exerciseName].totalSets += exerciseSets.length;
          const multiplier = exercise.weightType === "dumbbell weight" ? 2 : 1;

          // Calculate total volume (reps × weight for each set) and collect weights
          exerciseSets.forEach((set) => {
            if (set.reps && set.weight) {
              exerciseSummaries[exerciseName].totalVolume +=
                set.reps * set.weight * multiplier;

              // Add unique weights to the array
              if (
                !exerciseSummaries[exerciseName].weights.includes(set.weight)
              ) {
                exerciseSummaries[exerciseName].weights.push(set.weight);
              }
            }
          });
        }
      });
    }
  });

  // Sort weights arrays for consistency
  Object.values(exerciseSummaries).forEach((exercise) => {
    exercise.weights.sort((a, b) => a - b);
  });

  return {
    exercises: exerciseSummaries,
  };
}
