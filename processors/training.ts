import { BaseProcessor } from "./base";
import { DailyMetrics, WeeklyMetrics } from "../types";
import { calculateTrainingSummary } from "./utils/training-summary";

/**
 * Convert a UTC date string to Central European Time (CET/CEST)
 * @param utcDateString - UTC date string (e.g., "2025-08-14T22:00:00Z")
 * @returns Date string in YYYY-MM-DD format in CET/CEST timezone
 */
function convertToCentralEuropeanTime(utcDateString: string): string {
  const date = new Date(utcDateString);

  // Format directly in Central European Time (CET/CEST)
  return date.toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
}

interface TrainingData {
  trainings: Training[];
  calendarDays: CalendarDay[];
  exercises: Exercise[];
  exerciseSets: ExerciseSet[];
  exerciseSetApproaches: ExerciseSetApproach[];
}

interface Training {
  id: string;
  name: string;
  trainingDescription?: string;
  exerciseSetIds?: string[];
}

interface CalendarDay {
  date: string;
  trainingId?: string;
}

interface Exercise {
  id: string;
  name: string;
  isWeightDoubled: boolean;
}

interface ExerciseSet {
  id: string;
  exerciseId: string;
  approachIds?: string[];
}

interface ExerciseSetApproach {
  id: string;
  repeats?: number;
  weight?: number;
}

interface FormattedExercise {
  name: string;
  weightType: string;
  sets: FormattedExerciseSet[];
}

interface FormattedExerciseSet {
  reps: number;
  weight: number;
}

export class TrainingProcessor extends BaseProcessor {
  private sourceFile: string;

  constructor() {
    super();
    this.sourceFile = this.findGymTrackerFile();
  }

  /**
   * Find the .gymtracker file in the sources directory
   * @returns Path to the .gymtracker file
   */
  private findGymTrackerFile(): string {
    const files = this.findFilesByExtension(".gymtracker");
    return files[0]; // Return the first (and should be only) gymtracker file
  }

  /**
   * Load training data from the .gymtracker file
   * @returns The parsed training data
   */
  private loadTrainingData(): TrainingData {
    return this.loadJSONFile<TrainingData>(this.sourceFile);
  }

  /**
   * Process training data into daily metrics
   * @param trainingData - The training data to process
   * @returns Array of daily metrics
   */
  private createDailyMetrics(trainingData: TrainingData): DailyMetrics[] {
    if (!trainingData.trainings || trainingData.trainings.length === 0) {
      throw new Error("No training data found");
    }

    // Create days array from calendarDays, filtering out days without trainingId
    const days = trainingData.calendarDays
      .filter((day) => day.trainingId)
      .map((day) => ({
        ...day,
        date: convertToCentralEuropeanTime(day.date),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
      });

    // Process each day into DailyMetrics
    return days.map((day) => this.formatTrainingDay(day, 0, trainingData));
  }

  /**
   * Format a single training day
   * @param day - Training day data
   * @param index - Day index
   * @param trainingData - Complete training data
   * @returns Formatted training day
   */
  private formatTrainingDay(
    day: CalendarDay,
    index: number,
    trainingData: TrainingData,
  ): DailyMetrics {
    const training = trainingData.trainings.find(
      (training) => training.id === day.trainingId,
    );

    const formattedExercises = this.getFormattedExercises(
      training,
      trainingData,
    );
    const description = this.buildTrainingDescription(training);

    return {
      date: day.date,
      metrics: {},
      ...(description && { description }),
      exercises: formattedExercises,
    };
  }

  private getFormattedExercises(
    training: Training | undefined,
    trainingData: TrainingData,
  ): FormattedExercise[] {
    if (!training?.exerciseSetIds?.length) {
      return [];
    }

    return training.exerciseSetIds
      .map((setId) => this.findExerciseSetById(setId, trainingData))
      .filter((exerciseSet) => exerciseSet !== null)
      .map((exerciseSet) => {
        const exercise = this.findExerciseById(
          exerciseSet!.exerciseId,
          trainingData,
        );
        return exercise
          ? this.formatExercise(
              exercise,
              exerciseSet!,
              trainingData.exerciseSetApproaches,
            )
          : null;
      })
      .filter((exercise): exercise is FormattedExercise => exercise !== null);
  }

  private findExerciseSetById(
    setId: string,
    trainingData: TrainingData,
  ): ExerciseSet | null {
    return trainingData.exerciseSets.find((set) => set.id === setId) || null;
  }

  private findExerciseById(
    exerciseId: string,
    trainingData: TrainingData,
  ): Exercise | null {
    return trainingData.exercises.find((ex) => ex.id === exerciseId) || null;
  }

  private buildTrainingDescription(
    training: Training | undefined,
  ): string | undefined {
    if (!training) return undefined;

    const name = training.name || "";
    const desc = training.trainingDescription || "";

    if (name && desc) {
      return `${name} | ${desc}`;
    }
    if (name) {
      return name === "Unnamed Training" ? undefined : name;
    }
    return desc || undefined;
  }

  /**
   * Format a single exercise with its sets
   * @param exercise - Exercise data
   * @param exerciseSet - Exercise set data
   * @param approaches - Array of approach data
   * @returns Formatted exercise
   */
  private formatExercise(
    exercise: Exercise,
    exerciseSet: ExerciseSet,
    approaches: ExerciseSetApproach[],
  ): FormattedExercise {
    const sets: FormattedExerciseSet[] = [];

    // Build sets array with reps and weight
    if (
      exerciseSet &&
      exerciseSet.approachIds &&
      exerciseSet.approachIds.length > 0
    ) {
      exerciseSet.approachIds.forEach((approachId) => {
        const approach = approaches.find((a) => a.id === approachId);
        if (approach) {
          sets.push({
            reps: approach.repeats || 0,
            weight: approach.weight || 0,
          });
        }
      });
    }

    return {
      name: exercise.name.trim() || "Unnamed Exercise",
      weightType: exercise.isWeightDoubled ? "dumbbell weight" : "total weight",
      sets: sets,
    };
  }

  /**
   * Create summary for training data
   * @param dailyMetrics - Array of daily metrics
   * @returns Summary object with training statistics
   */
  protected createSummary(
    dailyMetrics: DailyMetrics[],
  ): string | Record<string, unknown> {
    return calculateTrainingSummary(dailyMetrics);
  }

  /**
   * Main processing method
   */
  public process(): WeeklyMetrics[] {
    try {
      console.log("Loading training data...");
      const trainingData = this.loadTrainingData();

      console.log("Processing training data...");
      const dailyMetrics = this.createDailyMetrics(trainingData);

      console.log("Grouping by week...");
      const weeklyMetrics = this.createWeeklyMetrics(dailyMetrics);

      console.log("Saving weekly files...");
      this.saveWeeklyFiles(weeklyMetrics, "training");

      console.log("Training processing completed successfully!");
      return weeklyMetrics;
    } catch (error) {
      console.error(
        "Error processing training data:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
