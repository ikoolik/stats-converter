# Stats Converter

A Node.js application that processes health and fitness data exports from mobile apps into organized weekly JSON files.

## Overview

This project processes file exports from:

- **Gym Tracker** app - for workout and training data
- **Health Export CSV** app - for health metrics from Apple HealthKit
- **Cronometer** app - for nutrition and macro tracking data

The processor combines and organizes this data into weekly JSON files with comprehensive health and fitness metrics.

## Features

- **Health Data Processing**: Analyzes sleep patterns, heart rate, steps, body composition, and more
- **Training Data Processing**: Processes workout sessions, exercises, and performance metrics
- **Macros Data Processing**: Processes nutrition data including fat, carbs, protein, and total calories
- **Weekly Aggregation**: Groups data by ISO weeks for easy analysis
- **Cross-platform**: Works with Apple HealthKit data exports
- **Modular Design**: Separate processors for health, training, and macros data

## Prerequisites

- Node.js (version 14 or higher)
- Health data exported from Health Export CSV app
- Training data exported from Gym Tracker app
- Nutrition data exported from Cronometer app

## Installation

1. Clone the repository:

```bash
git clone git@github.com:ikoolik/stats-converter.git
cd stats-converter
```

2. The project uses only Node.js built-in modules, so no additional dependencies are required.

## Usage

### 1. Prepare Your Data

Place your exported files in the `sources/` folder:

- **Health data**: CSV files exported from Health Export CSV app (files starting with "HK")
- **Training data**: Backup files exported from Gym Tracker app
- **Nutrition data**: `chart.csv` file exported from Cronometer app

### 2. Run the Processor

```bash
node process.js
```

### 3. View Results

Processed data will be saved in the `results/` folder as weekly JSON files:

- `YYYY-week-XX-health.json` - Health and body composition data
- `YYYY-week-XX-training.json` - Workout and training data
- `YYYY-week-XX-macros.json` - Nutrition and macro data

## Data Sources

### Health Export CSV

Exports Apple HealthKit data to CSV format, including:

- Sleep analysis (Core, Deep, REM sleep stages)
- Heart rate measurements
- Step counts
- Body composition (BMI, body fat, lean mass)
- Calculated metrics (FFMI, BCI)

### Gym Tracker

Provides workout and training data including:

- Exercise sessions
- Sets, reps, and weights
- Workout duration and intensity
- Performance tracking

### Cronometer

Provides nutrition and macro tracking data including:

- Daily fat, carbohydrate, and protein intake
- Total caloric intake calculated from macros
- Nutritional data for comprehensive health analysis

## Output Format

### Health Data (`YYYY-week-XX-health.json`)

```json
{
  "week": "2024-week-01",
  "totalDays": 7,
  "measurements": [
    {
      "date": "2024-01-01",
      "BodyMass": { "value": 75.5, "unit": "kg" },
      "BodyFatPercentage": { "value": 15.2, "unit": "%" },
      "HeartRate": { "value": 68.5, "unit": "count/min" },
      "Sleep": {
        "Core": "6h 30m",
        "Deep": "1h 15m",
        "REM": "1h 45m",
        "Total": "9h 30m",
        "wakeUps": 3
      }
    }
  ]
}
```

### Macros Data (`YYYY-week-XX-macros.json`)

```json
{
  "week": "2024-week-01",
  "totalDays": 7,
  "measurements": [
    {
      "date": "2024-01-01",
      "fat": 65.2,
      "carbs": 250.5,
      "protein": 180.3,
      "totalKcal": 2345.8
    }
  ]
}
```

### Training Data (`YYYY-week-XX-training.json`)

```json
{
  "week": "2024-week-01",
  "totalWorkouts": 4,
  "workouts": [
    {
      "date": "2024-01-01",
      "exercises": [
        {
          "name": "Bench Press",
          "sets": [
            { "weight": 80, "reps": 8 },
            { "weight": 80, "reps": 8 }
          ]
        }
      ]
    }
  ]
}
```

## Project Structure

```
stats-converter/
├── process.js              # Main orchestration script
├── processors/
│   ├── health.js          # Health data processor
│   ├── training.js        # Training data processor
│   └── macros.js          # Macros data processor
├── sources/               # Input data files (not tracked in git)
│   ├── .gitkeep
│   ├── HK*.csv            # Health data files (multiple files starting with HK)
│   ├── gymtracker-backup.gymtracker
│   └── chart.csv
├── results/               # Output JSON files (not tracked in git)
│   └── .gitkeep
└── README.md
```

## Configuration

The processor automatically detects and processes all supported file types in the `sources/` folder. No configuration is required for basic usage.

## Error Handling

- Missing source files are handled gracefully with informative error messages
- Invalid data formats are logged and skipped
- Processing continues even if individual files have issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please open an issue on GitHub.

---

**Note**: This project processes personal health and fitness data. Ensure you have proper backups of your original data files before processing.
