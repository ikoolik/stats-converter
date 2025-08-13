const fs = require('fs');
const path = require('path');

class TrainingProcessor {
    constructor() {
        this.sourcesDir = path.join(__dirname, '..', 'sources');
        this.resultsDir = path.join(__dirname, '..', 'results');
        this.sourceFile = this.findGymTrackerFile();
    }

    /**
     * Find the .gymtracker file in the sources directory
     * @returns {string} Path to the .gymtracker file
     */
    findGymTrackerFile() {
        try {
            const files = fs.readdirSync(this.sourcesDir);
            const gymTrackerFile = files.find(file => file.endsWith('.gymtracker'));
            
            if (!gymTrackerFile) {
                throw new Error(`No .gymtracker file found in ${this.sourcesDir}`);
            }
            
            return path.join(this.sourcesDir, gymTrackerFile);
        } catch (error) {
            throw new Error(`Failed to find .gymtracker file: ${error.message}`);
        }
    }

    /**
     * Load training data from the .gymtracker file
     * @returns {Object} The parsed training data
     */
    loadTrainingData() {
        try {
            if (!fs.existsSync(this.sourceFile)) {
                throw new Error(`GymTracker file not found: ${this.sourceFile}`);
            }
            
            const content = fs.readFileSync(this.sourceFile, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to load GymTracker data: ${error.message}`);
        }
    }

    /**
     * Process training data and generate weekly reports
     * @param {Object} trainingData - The training data to process
     * @returns {Object} Processed weekly data
     */
    processTrainingData(trainingData) {
        if (!trainingData.trainings || trainingData.trainings.length === 0) {
            throw new Error('No training data found');
        }

        // Create days array from calendarDays, filtering out days without trainingId
        const days = trainingData.calendarDays
            .filter(day => day.trainingId)
            .map(day => ({
                ...day,
                date: new Date(day.date).toLocaleDateString()
            }))
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA; // Descending order (newest first)
            });

        // Group days by week
        const weeklyData = this.groupDaysByWeek(days);

        // Process each week
        const processedWeeks = {};
        Object.keys(weeklyData).forEach(weekKey => {
            const weekDays = weeklyData[weekKey];
            processedWeeks[weekKey] = this.processWeek(weekDays, trainingData);
        });

        return processedWeeks;
    }

    /**
     * Group training days by week
     * @param {Array} days - Array of training days
     * @returns {Object} Days grouped by week
     */
    groupDaysByWeek(days) {
        const weeklyData = {};
        
        days.forEach(day => {
            const date = new Date(day.date);
            const year = date.getFullYear();
            const weekNumber = this.getWeekNumber(date);
            const weekKey = `${year}-week-${weekNumber.toString().padStart(2, '0')}`;
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = [];
            }
            
            weeklyData[weekKey].push(day);
        });

        return weeklyData;
    }

    /**
     * Get ISO week number for a date
     * @param {Date} date - The date to get week number for
     * @returns {number} The week number
     */
    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    /**
     * Process a single week of training data
     * @param {Array} weekDays - Array of training days for the week
     * @param {Object} trainingData - Complete training data
     * @returns {Object} Processed week data
     */
    processWeek(weekDays, trainingData) {
        const formattedDays = weekDays.map((day, index) => {
            return this.formatTrainingDay(day, index, trainingData);
        });

        return {
            totalDays: weekDays.length,
            trainings: formattedDays
        };
    }

    /**
     * Format a single training day
     * @param {Object} day - Training day data
     * @param {number} index - Day index
     * @param {Object} trainingData - Complete training data
     * @returns {Object} Formatted training day
     */
    formatTrainingDay(day, index, trainingData) {
        const formattedExercises = [];
        
        // Find training for this day
        const training = trainingData.trainings.find(training => training.id === day.trainingId);
        if (training) {
            if (training.exerciseSetIds && training.exerciseSetIds.length > 0) {
                training.exerciseSetIds.forEach(setId => {
                    // Find the exercise set by ID
                    const exerciseSet = trainingData.exerciseSets.find(set => set.id === setId);
                    if (exerciseSet) {
                        // Find the exercise by ID
                        const exercise = trainingData.exercises.find(ex => ex.id === exerciseSet.exerciseId);
                        if (exercise) {
                            formattedExercises.push(this.formatExercise(exercise, exerciseSet, trainingData.exerciseSetApproaches));
                        }
                    }
                });
            }
        }
        
        return {
            date: day.date,
            training: training ? {
                name: training.name || 'Unnamed Training',
                description: training.trainingDescription || ''
            } : null,
            exercises: formattedExercises
        };
    }

    /**
     * Format a single exercise with its sets
     * @param {Object} exercise - Exercise data
     * @param {Object} exerciseSet - Exercise set data
     * @param {Array} approaches - Array of approach data
     * @returns {Object} Formatted exercise
     */
    formatExercise(exercise, exerciseSet, approaches) {
        const sets = [];
        
        // Build sets array with reps and weight
        if (exerciseSet && exerciseSet.approachIds && exerciseSet.approachIds.length > 0) {
            exerciseSet.approachIds.forEach((approachId, setIndex) => {
                const approach = approaches.find(a => a.id === approachId);
                if (approach) {
                    sets.push({
                        reps: approach.repeats || 0,
                        weight: approach.weight || 0
                    });
                }
            });
        }
        
        return {
            name: exercise.name.trim() || 'Unnamed Exercise',
            weightType: exercise.isWeightDoubled ? 'dumbbell weight' : 'total weight',
            sets: sets
        };
    }

    /**
     * Save processed data to weekly files
     * @param {Object} processedWeeks - Processed weekly data
     */
    saveWeeklyFiles(processedWeeks) {
        // Create results directory if it doesn't exist
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir);
        }
        
        // Create separate file for each week
        Object.keys(processedWeeks).forEach(weekKey => {
            const weekData = processedWeeks[weekKey];
            const weekResult = {
                week: weekKey,
                ...weekData
            };
            
            // Write results to weekly training file
            const outputFile = path.join(this.resultsDir, `${weekKey}-training.json`);
            fs.writeFileSync(outputFile, JSON.stringify(weekResult, null, 2));
            console.log(`Training results written to ${outputFile}`);
        });
    }

    /**
     * Main processing method
     */
    process() {
        try {
            console.log('Loading training data...');
            const trainingData = this.loadTrainingData();
            
            console.log('Processing training data...');
            const processedWeeks = this.processTrainingData(trainingData);
            
            console.log('Saving weekly files...');
            this.saveWeeklyFiles(processedWeeks);
            
            console.log('Training processing completed successfully!');
            return processedWeeks;
        } catch (error) {
            console.error('Error processing training data:', error.message);
            throw error;
        }
    }
}

module.exports = TrainingProcessor;
