const fs = require('fs');
const path = require('path');

class MacrosProcessor {
    constructor() {
        this.sourcesDir = path.join(__dirname, '..', 'sources');
        this.resultsDir = path.join(__dirname, '..', 'results');
        this.sourceFile = path.join(this.sourcesDir, 'chart.csv');
    }

    /**
     * Check if the chart.csv file exists
     * @returns {boolean} True if file exists
     */
    checkSourceFile() {
        return fs.existsSync(this.sourceFile);
    }

    /**
     * Read and parse the chart.csv file
     * @returns {Array} Parsed macro data records
     */
    parseChartCSV() {
        try {
            if (!this.checkSourceFile()) {
                throw new Error(`chart.csv file not found in ${this.sourcesDir}`);
            }

            const content = fs.readFileSync(this.sourceFile, 'utf8');
            const lines = content.split('\n');
            
            // Skip header line
            const dataLines = lines.slice(1);
            const data = [];
            
            for (const line of dataLines) {
                if (line.trim() === '') continue;
                
                // Parse CSV line with proper handling of quoted fields
                const fields = this.parseCSVLine(line);
                
                if (fields.length >= 5) {
                    const dateTime = fields[0];
                    const fat = parseFloat(fields[2]) || 0;
                    const carbs = parseFloat(fields[3]) || 0;
                    const protein = parseFloat(fields[4]) || 0;
                    
                    // Calculate total calories (4 kcal/g for protein and carbs, 9 kcal/g for fat)
                    const totalKcal = (protein * 4) + (carbs * 4) + (fat * 9);
                    
                    const date = this.extractDate(dateTime);
                    
                    data.push({
                        date: date,
                        fat: this.roundToTwoDecimals(fat),
                        carbs: this.roundToTwoDecimals(carbs),
                        protein: this.roundToTwoDecimals(protein),
                        totalKcal: this.roundToTwoDecimals(totalKcal)
                    });
                }
            }
            
            return data;
        } catch (error) {
            throw new Error(`Failed to parse chart.csv: ${error.message}`);
        }
    }

    /**
     * Parse CSV line with proper handling of quoted fields
     * @param {string} line - CSV line to parse
     * @returns {Array} Array of field values
     */
    parseCSVLine(line) {
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
        
        return fields;
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
     * Group macro data by week
     * @param {Array} macroData - Array of macro data records
     * @returns {Object} Data grouped by week
     */
    groupByWeek(macroData) {
        const weeklyData = {};
        
        const sortedData = macroData
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        
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
     * Save weekly macro files
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
            
            const outputFile = path.join(this.resultsDir, `${weekKey}-macros.json`);
            fs.writeFileSync(outputFile, JSON.stringify(weekResult, null, 2));
            console.log(`Macros results written to ${outputFile}`);
        });
    }

    /**
     * Main processing method
     */
    process() {
        try {
            console.log('Loading macro data from chart.csv...');
            const macroData = this.parseChartCSV();
            console.log(`Total macro records read: ${macroData.length}`);
            
            console.log('Grouping macro data by week...');
            const weeklyData = this.groupByWeek(macroData);
            
            console.log('Saving weekly macro files...');
            this.saveWeeklyFiles(weeklyData);
            
            console.log('Macros processing completed successfully!');
            return weeklyData;
        } catch (error) {
            console.error('Error processing macro data:', error.message);
            throw error;
        }
    }
}

module.exports = MacrosProcessor;
