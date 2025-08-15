#!/usr/bin/env node

import * as path from "path";
import { TrainingProcessor } from "./processors/training";
import { HealthProcessor } from "./processors/health";
import { MacrosProcessor } from "./processors/macros";
import { WeeklyMetrics } from "./types";

/**
 * Main processing function that orchestrates all data processing
 */
function processAllData(): Record<string, unknown> {
  console.log("=== Starting Data Processing ===\n");

  try {
    // Process training data
    console.log("1. Processing Training Data...");
    const trainingProcessor = new TrainingProcessor();
    const trainingResults = trainingProcessor.process();
    console.log(
      `   ✓ Training data processed for ${Object.keys(trainingResults).length} weeks\n`,
    );

    // Process health data
    console.log("2. Processing Health Data...");
    const healthProcessor = new HealthProcessor();
    const healthResults = healthProcessor.process();
    console.log(
      `   ✓ Health data processed for ${Object.keys(healthResults).length} weeks\n`,
    );

    // Process macros data
    console.log("3. Processing Macros Data...");
    const macrosProcessor = new MacrosProcessor();
    const macrosResults = macrosProcessor.process();
    console.log(
      `   ✓ Macros data processed for ${Object.keys(macrosResults).length} weeks\n`,
    );

    console.log("=== Data Processing Completed Successfully ===");
    console.log(`Generated files in: ${path.join(__dirname, "results")}`);

    return {
      training: trainingResults,
      health: healthResults,
      macros: macrosResults,
    };
  } catch (error) {
    console.error(
      "Error during data processing:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * Generic processor function to reduce code duplication
 */
function processDataType<T>(
  ProcessorClass: new () => T & { process(): WeeklyMetrics[] },
  dataType: string,
): WeeklyMetrics[] {
  const capitalizedType = dataType.charAt(0).toUpperCase() + dataType.slice(1);
  console.log(`=== Processing ${capitalizedType} Data Only ===\n`);

  try {
    const processor = new ProcessorClass();
    const results = processor.process();

    console.log(`=== ${capitalizedType} Processing Completed ===`);
    console.log(`Generated files in: ${path.join(__dirname, "results")}`);

    return results;
  } catch (error) {
    console.error(
      `Error processing ${dataType} data:`,
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * Process only training data
 */
function processTrainingOnly(): WeeklyMetrics[] {
  return processDataType(TrainingProcessor, "training");
}

/**
 * Process only health data
 */
function processHealthOnly(): WeeklyMetrics[] {
  return processDataType(HealthProcessor, "health");
}

/**
 * Process only macros data
 */
function processMacrosOnly(): WeeklyMetrics[] {
  return processDataType(MacrosProcessor, "macros");
}

/**
 * Main function that handles command line arguments
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  switch (command.toLowerCase()) {
    case "training":
    case "train":
      processTrainingOnly();
      break;

    case "health":
      processHealthOnly();
      break;

    case "macros":
      processMacrosOnly();
      break;

    case "all":
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
  processMacrosOnly,
};
