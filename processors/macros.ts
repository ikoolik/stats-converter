import * as fs from 'fs';
import * as path from 'path';
import { BaseProcessor } from './base';
import { DailyMetrics, WeeklyMetrics } from '../types';

export class MacrosProcessor extends BaseProcessor {
    private sourceFile: string;

    constructor() {
        super();
        this.sourceFile = path.join(this.sourcesDir, 'chart.csv');
    }

    /**
     * Check if the chart.csv file exists
     * @returns True if file exists
     */
    private checkSourceFile(): boolean {
        return this.checkFileExists(this.sourceFile);
    }

    /**
     * Read and parse the chart.csv file
     * @returns Parsed macro data records
     */
    private parseChartCSV(): DailyMetrics[] {
        try {
            if (!this.checkSourceFile()) {
                throw new Error(`chart.csv file not found in ${this.sourcesDir}`);
            }

            const content = this.loadTextFile(this.sourceFile);
            const lines = content.split('\n');
            
            // Skip header line
            const dataLines = lines.slice(1);
            const data: DailyMetrics[] = [];
            
            for (const line of dataLines) {
                if (line.trim() === '') continue;
                
                // Parse CSV line with proper handling of quoted fields
                const fields = this.parseCSVLine(line);
                
                if (fields.length >= 5) {
                    const dateTime = fields[0];
                    const fatKcal = parseFloat(fields[2]) || 0;
                    const carbsKcal = parseFloat(fields[3]) || 0;
                    const proteinKcal = parseFloat(fields[4]) || 0;
                    
                    // Sum total calories
                    const totalKcal = fatKcal + carbsKcal + proteinKcal;
                    
                    // Convert calories to grams (4 kcal/g for protein and carbs, 9 kcal/g for fat)
                    const fatGrams = fatKcal / 9;
                    const carbsGrams = carbsKcal / 4;
                    const proteinGrams = proteinKcal / 4;
                    
                    const date = this.extractDate(dateTime);
                    
                    data.push({
                        date: date,
                        metrics: {
                            fat: this.roundToTwoDecimals(fatGrams),
                            carbs: this.roundToTwoDecimals(carbsGrams),
                            protein: this.roundToTwoDecimals(proteinGrams),
                            totalKcal: this.roundToTwoDecimals(totalKcal)
                        }
                    });
                }
            }
            
            return data;
        } catch (error) {
            throw new Error(`Failed to parse chart.csv: ${error instanceof Error ? error.message : String(error)}`);
        }
    }





    /**
     * Main processing method
     */
    public process(): WeeklyMetrics[] {
        try {
            console.log('Loading macro data from chart.csv...');
            const macroData = this.parseChartCSV();
            console.log(`Total macro records read: ${macroData.length}`);
            
            console.log('Grouping macro data by week...');
            const weeklyMetrics = this.createWeeklyMetrics(macroData);
            
            console.log('Saving weekly macro files...');
            this.saveWeeklyFiles(weeklyMetrics, 'macros');
            
            console.log('Macros processing completed successfully!');
            return weeklyMetrics;
        } catch (error) {
            console.error('Error processing macro data:', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
}
