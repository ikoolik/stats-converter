import { BaseProcessor } from "./base";
import { DailyMetrics, WeeklyMetrics } from "../types";

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
        date: new Date(day.date).toISOString().split("T")[0],
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
   * Group training days by week
   * @param days - Array of training days
   * @returns Days grouped by week
   */
  private groupDaysByWeek(days: CalendarDay[]): Record<string, CalendarDay[]> {
    const weeklyData: Record<string, CalendarDay[]> = {};

    days.forEach((day) => {
      const date = new Date(day.date);
      const year = date.getFullYear();
      const weekNumber = this.getWeekNumber(date);
      const weekKey = `${year}-week-${weekNumber.toString().padStart(2, "0")}`;

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }

      weeklyData[weekKey].push(day);
    });

    return weeklyData;
  }

  /**
   * Process a single week of training data
   * @param weekDays - Array of training days for the week
   * @param trainingData - Complete training data
   * @returns Processed week data
   */
  private processWeek(
    weekKey: string,
    weekDays: CalendarDay[],
    trainingData: TrainingData,
  ): WeeklyMetrics {
    const formattedDays = weekDays.map((day, index) => {
      return this.formatTrainingDay(day, index, trainingData);
    });

    return {
      week: weekKey,
      totalDays: weekDays.length,
      days: formattedDays,
    };
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
    const formattedExercises: FormattedExercise[] = [];

    // Find training for this day
    const training = trainingData.trainings.find(
      (training) => training.id === day.trainingId,
    );
    if (training) {
      if (training.exerciseSetIds && training.exerciseSetIds.length > 0) {
        training.exerciseSetIds.forEach((setId) => {
          // Find the exercise set by ID
          const exerciseSet = trainingData.exerciseSets.find(
            (set) => set.id === setId,
          );
          if (exerciseSet) {
            // Find the exercise by ID
            const exercise = trainingData.exercises.find(
              (ex) => ex.id === exerciseSet.exerciseId,
            );
            if (exercise) {
              formattedExercises.push(
                this.formatExercise(
                  exercise,
                  exerciseSet,
                  trainingData.exerciseSetApproaches,
                ),
              );
            }
          }
        });
      }
    }

    // Build description only if there's meaningful content
    let description: string | undefined = undefined;
    if (training) {
      const name = training.name || "Unnamed Training";
      const desc = training.trainingDescription || "";

      if (name && desc) {
        description = `${name} | ${desc}`;
      } else if (name) {
        description = name;
      } else if (desc) {
        description = desc;
      }
      // If neither name nor desc has content, description remains undefined
    }

    return {
      date: day.date,
      ...(description && { description }),
      exercises: formattedExercises,
    };
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
