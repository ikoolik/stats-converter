#!/usr/bin/env node

import { TrainingProcessor } from "./processors/training";
import { HealthProcessor } from "./processors/health";
import { MacrosProcessor } from "./processors/macros";

/**
 * Main function that processes all data
 */
function main() {
  const processors = [
    { name: "Training", processor: TrainingProcessor },
    { name: "Health", processor: HealthProcessor },
    { name: "Macros", processor: MacrosProcessor },
  ];

  console.log("=== Processing All Data ===\n");

  processors.forEach((config, index) => {
    try {
      console.log(`${index + 1}. Processing ${config.name} Data...`);

      const processor = new config.processor();
      const processorResults = processor.process();

      console.log(
        `   ✓ ${config.name} data processed for ${Object.keys(processorResults).length} weeks\n`,
      );
    } catch (error) {
      console.error(
        `   ✗ Error processing ${config.name} data:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  });

  console.log("=== Data Processing Completed ===");
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}
