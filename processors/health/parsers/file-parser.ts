import { DailyMetrics } from "../../../types";

/**
 * Interface for file parsers that convert raw files to DailyMetrics
 */
export interface FileParser {
  /**
   * Get list of supported filename patterns for this parser
   */
  getSupportedFiles(sourceDirectory: string): string[];

  /**
   * Parse a file and return DailyMetrics
   */
  parseFile(filePath: string): DailyMetrics[];

  /**
   * Get parser name for logging
   */
  getName(): string;
}
