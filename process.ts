#!/usr/bin/env node

import { TrainingProcessor } from './processors/training';
import { HealthProcessor } from './processors/health';
import { MacrosProcessor } from './processors/macros';

/**
 * Main processing function that orchestrates all data processing
 */
async function processAllData(): Promise<any> {
    console.log('=== Starting Data Processing ===\n');
    
    try {
        // Process training data
        console.log('1. Processing Training Data...');
        const trainingProcessor = new TrainingProcessor();
        const trainingResults = trainingProcessor.process();
        console.log(`   ✓ Training data processed for ${Object.keys(trainingResults).length} weeks\n`);
        
        // Process health data
        console.log('2. Processing Health Data...');
        const healthProcessor = new HealthProcessor();
        const healthResults = healthProcessor.process();
        console.log(`   ✓ Health data processed for ${Object.keys(healthResults).length} weeks\n`);
        
        // Process macros data
        console.log('3. Processing Macros Data...');
        const macrosProcessor = new MacrosProcessor();
        const macrosResults = macrosProcessor.process();
        console.log(`   ✓ Macros data processed for ${Object.keys(macrosResults).length} weeks\n`);
        
        console.log('=== Data Processing Completed Successfully ===');
        console.log(`Generated files in: ${require('path').join(__dirname, 'results')}`);
        
        return {
            training: trainingResults,
            health: healthResults,
            macros: macrosResults
        };
        
    } catch (error) {
        console.error('Error during data processing:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

/**
 * Process only training data
 */
async function processTrainingOnly(): Promise<any> {
    console.log('=== Processing Training Data Only ===\n');
    
    try {
        const trainingProcessor = new TrainingProcessor();
        const trainingResults = trainingProcessor.process();
        
        console.log('=== Training Processing Completed ===');
        console.log(`Generated files in: ${require('path').join(__dirname, 'results')}`);
        
        return trainingResults;
        
    } catch (error) {
        console.error('Error processing training data:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

/**
 * Process only health data
 */
async function processHealthOnly(): Promise<any> {
    console.log('=== Processing Health Data Only ===\n');
    
    try {
        const healthProcessor = new HealthProcessor();
        const healthResults = healthProcessor.process();
        
        console.log('=== Health Processing Completed ===');
        console.log(`Generated files in: ${require('path').join(__dirname, 'results')}`);
        
        return healthResults;
        
    } catch (error) {
        console.error('Error processing health data:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

/**
 * Process only macros data
 */
async function processMacrosOnly(): Promise<any> {
    console.log('=== Processing Macros Data Only ===\n');
    
    try {
        const macrosProcessor = new MacrosProcessor();
        const macrosResults = macrosProcessor.process();
        
        console.log('=== Macros Processing Completed ===');
        console.log(`Generated files in: ${require('path').join(__dirname, 'results')}`);
        
        return macrosResults;
        
    } catch (error) {
        console.error('Error processing macros data:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

/**
 * Main function that handles command line arguments
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';
    
    switch (command.toLowerCase()) {
        case 'training':
        case 'train':
            processTrainingOnly();
            break;
            
        case 'health':
            processHealthOnly();
            break;
            
        case 'macros':
            processMacrosOnly();
            break;
            
        case 'all':
        default:
            processAllData();
            break;
    }
}

// Run the main function if this file is executed directly
if (require.main === module) {
    main();
}

export {
    processAllData,
    processTrainingOnly,
    processHealthOnly,
    processMacrosOnly
};
