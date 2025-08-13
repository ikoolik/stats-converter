const fs = require('fs');
const path = require('path');

// Constants
const SLEEP_SESSION_GAP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

class HealthProcessor {
    constructor() {
        this.sourcesDir = path.join(__dirname, '..', 'sources');
        this.resultsDir = path.join(__dirname, '..', 'results');
    }

    /**
     * Find all CSV health data files in the sources directory
     * @returns {Array} Array of CSV file paths
     */
    findHealthDataFiles() {
        try {
            const files = fs.readdirSync(this.sourcesDir);
            const csvFiles = files.filter(file => file.endsWith('.csv'));
            
            if (csvFiles.length === 0) {
                throw new Error(`No CSV health data files found in ${this.sourcesDir}`);
            }
            
            return csvFiles.map(file => path.join(this.sourcesDir, file));
        } catch (error) {
            throw new Error(`Failed to find health data files: ${error.message}`);
        }
    }

    /**
     * Extract date from timestamp (ignoring time)
     * @param {string} timestamp - The timestamp string
     * @returns {string} The date in YYYY-MM-DD format
     */
    extractDate(timestamp) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format: ${timestamp}`);
        }
        return date.toISOString().split('T')[0];
    }

    /**
     * Round values to two decimal places
     * @param {number} value - The value to round
     * @returns {number} The rounded value
     */
    roundToTwoDecimals(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Calculate height from BMI and body mass
     * @param {number} bodyMass - Body mass in kg
     * @param {number} bmi - Body mass index
     * @returns {number} Height in meters
     */
    calculateHeight(bodyMass, bmi) {
        return Math.sqrt(bodyMass / bmi);
    }

    /**
     * Calculate FFMI (Fat-Free Mass Index)
     * @param {number} leanBodyMass - Lean body mass in kg
     * @param {number} height - Height in meters
     * @returns {number} FFMI value
     */
    calculateFFMI(leanBodyMass, height) {
        return leanBodyMass / (height * height);
    }

    /**
     * Calculate BCI (Body Composition Index)
     * @param {number} ffmi - FFMI value
     * @param {number} bodyFatPercentage - Body fat percentage (0-1)
     * @returns {number} BCI value
     */
    calculateBCI(ffmi, bodyFatPercentage) {
        return ffmi * (1 - bodyFatPercentage);
    }

    /**
     * Calculate average heart rate for a day
     * @param {Array} heartRateData - Array of heart rate records
     * @returns {number|null} Average heart rate or null if no data
     */
    calculateAverageHeartRate(heartRateData) {
        if (!heartRateData || heartRateData.length === 0) {
            return null;
        }
        
        const sum = heartRateData.reduce((acc, record) => acc + record.value, 0);
        return this.roundToTwoDecimals(sum / heartRateData.length);
    }

    /**
     * Calculate total steps for a day
     * @param {Array} stepData - Array of step records
     * @returns {number|null} Total steps or null if no data
     */
    calculateTotalSteps(stepData) {
        if (!stepData || stepData.length === 0) {
            return null;
        }
        
        const total = stepData.reduce((acc, record) => acc + record.value, 0);
        return Math.round(total);
    }

    /**
     * Calculate sleep metrics for a day
     * @param {Array} sleepData - Array of sleep records
     * @returns {Object|null} Sleep metrics or null if no data
     */
    calculateSleepMetrics(sleepData) {
        if (!sleepData || sleepData.length === 0) {
            return null;
        }
        
        const sleepMetrics = {
            inBed: 0,
            asleepCore: 0,
            asleepDeep: 0,
            asleepREM: 0,
            awake: 0,
            wakeUps: 0
        };
        
        let previousState = null;
        
        for (const record of sleepData) {
            const duration = record.duration;
            const state = record.value;
            
            if (sleepMetrics.hasOwnProperty(state)) {
                sleepMetrics[state] += duration;
            }
            
            // Count wake-ups (transitions from asleep to awake)
            if (previousState && 
                (previousState === 'asleepCore' || previousState === 'asleepDeep' || previousState === 'asleepREM') && 
                state === 'awake') {
                sleepMetrics.wakeUps++;
            }
            
            previousState = state;
        }
        
        const totalSleep = sleepMetrics.asleepCore + sleepMetrics.asleepDeep + sleepMetrics.asleepREM;
        
        return {
            Core: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepCore)),
            Deep: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepDeep)),
            REM: this.formatTimeFromMinutes(Math.round(sleepMetrics.asleepREM)),
            Total: this.formatTimeFromMinutes(Math.round(totalSleep)),
            wakeUps: sleepMetrics.wakeUps
        };
    }

    /**
     * Format minutes into "##h ##m" format
     * @param {number} minutes - Minutes to format
     * @returns {string} Formatted time string
     */
    formatTimeFromMinutes(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }

    /**
     * Calculate duration between two timestamps in minutes
     * @param {string} startDate - Start timestamp
     * @param {string} endDate - End timestamp
     * @returns {number} Duration in minutes
     */
    calculateDurationMinutes(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.round((end - start) / (1000 * 60));
    }

    /**
     * Group sleep data by sleep session (handles cross-midnight sessions)
     * @param {Array} sleepData - Array of sleep records
     * @returns {Object} Sleep sessions grouped by date
     */
    groupSleepDataBySession(sleepData) {
        if (!sleepData || sleepData.length === 0) {
            return {};
        }
        
        const sortedData = sleepData.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        
        const sessions = {};
        let sessionData = [];
        
        for (const record of sortedData) {
            const startTime = new Date(record.startDate);
            
            if (sessionData.length === 0 || (startTime - new Date(sessionData[sessionData.length - 1].endDate)) > SLEEP_SESSION_GAP_THRESHOLD_MS) {
                if (sessionData.length > 0) {
                    const sessionKey = this.extractDate(sessionData[0].startDate);
                    sessions[sessionKey] = sessionData;
                }
                sessionData = [record];
            } else {
                sessionData.push(record);
            }
        }
        
        if (sessionData.length > 0) {
            const sessionKey = this.extractDate(sessionData[0].startDate);
            sessions[sessionKey] = sessionData;
        }
        
        return sessions;
    }

    /**
     * Read and parse CSV file from "Health Export CSV" app
     * @param {string} filePath - Path to the CSV file
     * @returns {Array} Parsed data records
     */
    parseHKCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        const dataLines = lines.slice(2); // Skip sep=, and header
        const data = [];
        
        for (const line of dataLines) {
            if (line.trim() === '') continue;
            
            const fields = [];
            let currentField = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    fields.push(currentField.trim());
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
            fields.push(currentField.trim());
            
            if (fields.length >= 8) {
                const type = fields[0];
                const sourceName = fields[1];
                const startDate = fields[5];
                const endDate = fields[6];
                
                // Filter step count data to only include Zepp Life source
                if (type === 'HKQuantityTypeIdentifierStepCount' && sourceName !== 'Zepp Life') {
                    continue;
                }
                
                const dateKey = this.extractDate(startDate);
                
                if (type === 'HKCategoryTypeIdentifierSleepAnalysis') {
                    const value = fields[7];
                    const duration = this.calculateDurationMinutes(startDate, endDate);
                    
                    data.push({
                        date: dateKey,
                        type: type,
                        value: value,
                        duration: duration,
                        startDate: startDate,
                        endDate: endDate
                    });
                } else if (fields.length >= 9) {
                    const unit = fields[7];
                    const value = fields[8];
                    
                    data.push({
                        date: dateKey,
                        type: type,
                        value: type === 'HKQuantityTypeIdentifierBodyFatPercentage' ? 
                            this.roundToTwoDecimals(parseFloat(value) * 100) : 
                            this.roundToTwoDecimals(parseFloat(value)),
                        unit: unit
                    });
                }
            }
        }
        
        return data;
    }

    /**
     * Load and parse all health data files
     * @returns {Array} All parsed health data records
     */
    loadHealthData() {
        try {
            const csvFiles = this.findHealthDataFiles();
            const allData = [];
            
            for (const filePath of csvFiles) {
                const fileName = path.basename(filePath);
                console.log(`Reading file: ${fileName}`);
                
                try {
                    const fileData = this.parseHKCSV(filePath);
                    allData.push(...fileData);
                } catch (error) {
                    console.error(`Error reading file ${fileName}:`, error.message);
                }
            }
            
            return allData;
        } catch (error) {
            throw new Error(`Failed to load health data: ${error.message}`);
        }
    }

    /**
     * Combine health data by date
     * @param {Array} data - Array of health data records
     * @returns {Object} Combined data organized by date
     */
    combineByDate(data) {
        const combined = {};
        
        // Group data by date and type for processing
        const groupedByDate = {};
        
        for (const record of data) {
            const date = record.date;
            const type = record.type;
            
            if (!groupedByDate[date]) {
                groupedByDate[date] = {};
            }
            
            if (!groupedByDate[date][type]) {
                groupedByDate[date][type] = [];
            }
            
            groupedByDate[date][type].push(record);
        }
        
        // Process each date
        for (const date in groupedByDate) {
            const dateData = groupedByDate[date];
            combined[date] = {};
            
            // Process body composition data (single measurements)
            for (const type in dateData) {
                const records = dateData[type];
                
                if (type === 'HKQuantityTypeIdentifierBodyFatPercentage' ||
                    type === 'HKQuantityTypeIdentifierBodyMass' ||
                    type === 'HKQuantityTypeIdentifierBodyMassIndex' ||
                    type === 'HKQuantityTypeIdentifierLeanBodyMass') {
                    
                    if (records.length > 0) {
                        const measurementType = type.replace('HKQuantityTypeIdentifier', '');
                        combined[date][measurementType] = {
                            value: records[0].value,
                            unit: records[0].unit
                        };
                    }
                }
            }
            
            // Process heart rate data (calculate average)
            if (dateData['HKQuantityTypeIdentifierHeartRate']) {
                const heartRateData = dateData['HKQuantityTypeIdentifierHeartRate'];
                const avgHeartRate = this.calculateAverageHeartRate(heartRateData);
                
                if (avgHeartRate !== null) {
                    combined[date]['HeartRate'] = {
                        value: avgHeartRate,
                        unit: 'count/min'
                    };
                }
            }
            
            // Process step count data (calculate total)
            if (dateData['HKQuantityTypeIdentifierStepCount']) {
                const stepData = dateData['HKQuantityTypeIdentifierStepCount'];
                const totalSteps = this.calculateTotalSteps(stepData);
                
                if (totalSteps !== null) {
                    combined[date]['StepCount'] = {
                        value: totalSteps,
                        unit: 'count'
                    };
                }
            }
        }
        
        // Process sleep data separately to handle cross-midnight sessions
        const allSleepData = data.filter(record => record.type === 'HKCategoryTypeIdentifierSleepAnalysis');
        if (allSleepData.length > 0) {
            const sleepSessions = this.groupSleepDataBySession(allSleepData);
            
            for (const sessionDate in sleepSessions) {
                const sessionData = sleepSessions[sessionDate];
                const sleepMetrics = this.calculateSleepMetrics(sessionData);

                if (sleepMetrics !== null) {
                    if (!combined[sessionDate]) {
                        combined[sessionDate] = {};
                    }
                    
                    combined[sessionDate]['Sleep'] = sleepMetrics;
                }
            }
        }
        
        // Calculate FFMI and BCI for each date
        for (const date in combined) {
            const measurements = combined[date];
            
            if (measurements['BodyMass'] && measurements['BodyMassIndex'] && 
                measurements['LeanBodyMass'] && measurements['BodyFatPercentage']) {
                
                const bodyMass = measurements['BodyMass'].value;
                const bmi = measurements['BodyMassIndex'].value;
                const leanBodyMass = measurements['LeanBodyMass'].value;
                const bodyFatPercentage = measurements['BodyFatPercentage'].value;
                
                const height = this.calculateHeight(bodyMass, bmi);
                const ffmi = this.calculateFFMI(leanBodyMass, height);
                const bci = this.calculateBCI(ffmi, bodyFatPercentage / 100);
                
                measurements['FFMI'] = {
                    value: this.roundToTwoDecimals(ffmi),
                    unit: 'kg/m²'
                };
                measurements['BCI'] = {
                    value: this.roundToTwoDecimals(bci),
                    unit: 'kg/m²'
                };
            }
        }
        
        return combined;
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
     * Group data by week
     * @param {Object} combinedData - Combined data by date
     * @returns {Object} Data grouped by week
     */
    groupByWeek(combinedData) {
        const weeklyData = {};
        
        const sortedData = Object.keys(combinedData)
            .sort()
            .map(date => ({
                date: date,
                measurements: combinedData[date]
            }));
        
        sortedData.forEach(record => {
            const date = new Date(record.date);
            const year = date.getFullYear();
            const weekNumber = this.getWeekNumber(date);
            const weekKey = `${year}-week-${weekNumber.toString().padStart(2, '0')}`;
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = [];
            }
            
            weeklyData[weekKey].push(record);
        });
        
        return weeklyData;
    }

    /**
     * Save weekly files
     * @param {Object} weeklyData - Data grouped by week
     */
    saveWeeklyFiles(weeklyData) {
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir);
        }
        
        Object.keys(weeklyData).forEach(weekKey => {
            const weekData = weeklyData[weekKey];
            const weekResult = {
                week: weekKey,
                totalDays: weekData.length,
                measurements: weekData
            };
            
            const outputFile = path.join(this.resultsDir, `${weekKey}-composition.json`);
            fs.writeFileSync(outputFile, JSON.stringify(weekResult, null, 2));
            console.log(`Health results written to ${outputFile}`);
        });
    }

    /**
     * Main processing method
     */
    process() {
        try {
            console.log('Loading health data...');
            const allData = this.loadHealthData();
            console.log(`Total records read: ${allData.length}`);
            
            console.log('Processing health data...');
            const combinedData = this.combineByDate(allData);
            
            console.log('Grouping by week...');
            const weeklyData = this.groupByWeek(combinedData);
            
            console.log('Saving weekly files...');
            this.saveWeeklyFiles(weeklyData);
            
            console.log('Health processing completed successfully!');
            return weeklyData;
        } catch (error) {
            console.error('Error processing health data:', error.message);
            throw error;
        }
    }
}

module.exports = HealthProcessor;
