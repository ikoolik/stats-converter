# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based health and fitness data processing application that converts exports from mobile health apps (Gym Tracker, Health Export CSV, Cronometer) into organized weekly JSON files. The system processes three types of data: health metrics, training/workout data, and nutrition/macros data.

## Development Commands

### Build and Run

```bash
npm run build          # Compile TypeScript to dist/
npm start              # Run compiled application (processes all data types)
npm run dev            # Run with ts-node for development
```

### Code Quality

```bash
npm run lint           # Run ESLint on TypeScript files
npm run lint:fix       # Run ESLint with automatic fixes
npm run format         # Format code with Prettier
npm run format:check   # Check if code is properly formatted
```

### Data Processing Commands

```bash
npm run process:all      # Build and process all data types
npm run process:health   # Build and process only health data
npm run process:macros   # Build and process only macros data
npm run process:training # Build and process only training data
```

### Direct CLI Usage

```bash
node dist/process.js [all|health|macros|training]
```

## Code Architecture

### Core System Design

The application follows a modular processor pattern with a shared base class:

- **BaseProcessor** (`processors/base.ts`): Provides shared utilities for file handling, CSV parsing, date manipulation, and weekly grouping
- **Specialized Processors**: Each data type has its own processor extending BaseProcessor, organized by domain:
  - **HealthProcessor** (`processors/health/index.ts`): Processes Apple HealthKit CSV exports with complex sleep analysis and body composition calculations
  - **TrainingProcessor** (`processors/training/index.ts`): Processes Gym Tracker backup files (JSON format)
  - **MacrosProcessor** (`processors/macros/index.ts`): Processes Cronometer chart.csv nutrition data

### Data Flow

1. **Input**: Raw files placed in `sources/` directory
2. **Processing**: Processors parse, validate, and transform data
3. **Grouping**: Data is organized by ISO week numbers using `getWeekNumber()` method
4. **Output**: Weekly JSON files saved to `results/` directory with naming pattern `YYYY-week-XX-{type}.json`

### Key Processing Features

- **Health Data**: Complex sleep session merging, body composition metrics (FFMI, BCI), heart rate analysis
- **Training Data**: Exercise set/rep tracking, weight normalization for bilateral exercises
- **Macros Data**: Caloric conversion from macronutrient data (fat: 9 kcal/g, carbs/protein: 4 kcal/g)
- **Weekly Aggregation**: ISO week-based grouping with proper year boundary handling

## File Structure and Data Sources

### Processor Organization

The codebase is organized by domain (data type) rather than technical concerns:

```
processors/
├── base.ts                    # Shared base class
├── health/                    # Health data processing
│   ├── index.ts              # Main HealthProcessor
│   ├── parsers.ts            # CSV parsing logic
│   ├── strategies.ts         # Metric processing strategies
│   ├── calculations.ts       # Health calculations
│   ├── constants.ts          # Health-specific constants
│   ├── sleep-calculator.ts   # Sleep analysis logic
│   └── summary.ts            # Summary calculations
├── training/                  # Training data processing
│   ├── index.ts              # Main TrainingProcessor
│   └── summary.ts            # Training summary calculations
└── macros/                    # Nutrition data processing
    ├── index.ts              # Main MacrosProcessor
    └── summary.ts            # Macros summary calculations
```

### Expected Input Files (`sources/`)

- Health data: Multiple CSV files starting with "HK" (Health Export CSV app)
- Training data: `.gymtracker` backup files (Gym Tracker app)
- Macros data: `chart.csv` (Cronometer app)

### Output Files (`results/`)

- `YYYY-week-XX-health.json`: Health metrics, sleep, body composition
- `YYYY-week-XX-training.json`: Workout sessions and exercises
- `YYYY-week-XX-macros.json`: Daily nutrition and caloric intake

## Code Style Configuration

### Linting and Formatting

- ESLint configured with TypeScript, Prettier integration
- 2-space indentation, single quotes, always semicolons
- Console.log allowed (CLI application)
- Prettier: 100 char line width, trailing commas

### TypeScript Configuration

- Target: ES2020, CommonJS modules
- Strict mode enabled with comprehensive type checking
- Source maps and declarations generated
- Compiles `process.ts` and `processors/**/*.ts` to `dist/`

### Code Quality Guidelines

**Immutability and Safety:**

- Mark private fields as `readonly` if they're only assigned in the constructor
- Prefer nullish coalescing (`??`) over logical OR (`||`) for default values
- Use optional chaining (`?.`) instead of multiple `&&` checks for safer property access

**TypeScript Best Practices:**

- Use proper type guards instead of unnecessary type assertions
- Prefer `filter((item): item is Type => condition)` for type narrowing
- Avoid `!` assertions unless absolutely necessary

**Examples:**

```typescript
// Good
private readonly sourceFile: string;
const name = training.name ?? "";
if (exerciseSet?.approachIds?.length) { ... }

// Avoid
private sourceFile: string; // if never reassigned
const name = training.name || "";
if (exerciseSet && exerciseSet.approachIds && exerciseSet.approachIds.length) { ... }
```

## Development Notes

### Error Handling Strategy

- Processors continue processing even if individual files fail
- Graceful degradation with informative console messages
- File existence checks before processing
- Type validation for parsed data

### Date and Time Handling

- Uses ISO week calculation for consistent weekly grouping
- Timezone-aware date parsing for health data
- Sleep session boundary detection and merging

### Performance Considerations

- Processes data incrementally by type
- Memory-efficient CSV parsing with custom parser
- File-based output prevents memory accumulation
