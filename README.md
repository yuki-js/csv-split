# CSV Split

A utility tool designed to split large CSV files into smaller, more manageable chunks.

## Documentation

Detailed specifications for this tool are available in the following documents:

- [English Specification](docs/splitcsv.md)
- [Japanese Specification (日本語仕様書)](docs/splitcsv_ja.md)

## Features

- Split large CSV files into multiple smaller files
- Maintain the header row in each output file for data consistency
- Handle and discard metadata headers that may precede the actual CSV content
- Process multiple CSV files in a single directory
- Create standardized output file naming
- Configurable number of lines per output file
- Customizable output directory and file naming pattern

## Installation

### Global Installation

```bash
npm install -g csv-split
```

### Local Installation

```bash
npm install csv-split
```

## Usage

### Basic Usage

```bash
csv-split /path/to/csv/files
```

This command will:

1. Look for CSV files in `/path/to/csv/files`
2. Create an output directory at `/path/to/csv/files/outs`
3. Split each CSV file into multiple files with 100,000 rows each (default)
4. Name output files according to the pattern `{name}_{num}.csv`

### Advanced Options

```bash
csv-split /path/to/csv/files --lines 10000 --output /custom/output/dir --pattern "{name}_part_{num}.csv"
```

#### Available Options

- `-l, --lines <number>`: Number of lines per output file (default: 100000)
- `-o, --output <directory>`: Custom output directory (default: `<input>/outs`)
- `-p, --pattern <pattern>`: Output filename pattern (default: `{name}_{num}.csv`)
- `-h, --help`: Display help information
- `-v, --version`: Display version information

## Metadata Header Handling

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

## Development

### Setup

```bash
git clone https://github.com/yourusername/csv-split.git
cd csv-split
npm install
```

### Build

```bash
npm run build
```

### Run in Development Mode

```bash
npm run dev /path/to/csv/files
```

## License

MIT
