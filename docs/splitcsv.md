# CSV File Splitter Specification

## Overview

The CSV File Splitter is a utility tool designed to split large CSV files into smaller, more manageable chunks. This is particularly useful when dealing with CSV files containing millions of rows that may be difficult to process using standard tools or applications.

## Features

- Split large CSV files into multiple smaller files
- Maintain the header row in each output file for data consistency
- Handle and discard metadata headers that may precede the actual CSV content
- Process multiple CSV files in a single directory
- Create standardized output file naming

## Input and Output Specification

### Input

- **Command Line Arguments**: A directory path containing one or more CSV files
- **Input Files**: CSV files (must have `.csv` extension)
  - May contain optional metadata headers before the actual CSV content
  - Must contain at least one line with comma-separated values (the header row)

### Output

- **Output Directory**: A subdirectory named `outs` is created within the input directory
- **Output Files**: Multiple CSV files named according to the pattern `{original_name}_{sequence_number}.csv`
  - Sequence numbers are zero-padded to three digits (e.g., 001, 002, etc.)
  - Each file contains the original header row followed by a subset of data rows
  - No metadata headers are included in the output files

## Behavior Details

### Metadata Header Handling

Metadata headers are defined as lines at the beginning of a CSV file that don't contain commas. These lines are discarded during processing to ensure output files conform to standard CSV formatting.

Example of input with metadata headers:

```
Metadata: This is a sample metadata header
Metadata: Another metadata header
id,name,age
1,John Doe,30
2,Jane Smith,25
```

Example of output:

```
id,name,age
1,John Doe,30
2,Jane Smith,25
```

### Splitting Algorithm

1. Identify and skip metadata headers (lines without commas)
2. Identify the first line with commas as the CSV header
3. Write the header to the first output file
4. Continue reading data rows and writing to the current output file
5. When the configured number of lines per file is reached:
   - Close the current file
   - Create a new file with an incremented sequence number
   - Write the header to the new file
   - Continue with data rows
6. Repeat until all data rows are processed

### File Size Control

- Each output file (except potentially the last one) will contain exactly `LINES_PER_FILE` data rows, plus the header row
- The default value for `LINES_PER_FILE` is 100,000, but this can be modified in the configuration

## Implementation Notes

### Main Components

1. **Command Line Interface**: Processes arguments and validates the input directory
2. **File Discovery**: Identifies CSV files in the specified directory
3. **Metadata Detection**: Identifies and skips metadata headers
4. **Split Processing**: Reads the source file line by line and writes to output files
5. **Output Management**: Creates the output directory and manages file naming

### Error Handling

The implementation should handle the following error conditions:
- Missing or invalid input directory
- No CSV files found in the directory
- I/O errors during file reading or writing

## Usage Examples

### Basic Usage

```
ts-node splitcsv.ts /path/to/csv/files
```

This command will:
1. Look for CSV files in `/path/to/csv/files`
2. Create an output directory at `/path/to/csv/files/outs`
3. Split each CSV file into multiple files with 100,000 rows each
4. Name output files according to the pattern `{original_name}_{sequence_number}.csv`

## Performance Considerations

- The implementation processes files line by line to minimize memory usage
- Large files are handled efficiently through streaming
- File operations are performed sequentially for reliability

## Extension Possibilities

Potential extensions to the tool could include:
- Configurable output directory
- Adjustable number of lines per output file via command line
- Custom output file naming patterns
- Advanced CSV parsing for quoted fields with embedded commas
- Parallel processing of multiple input files
