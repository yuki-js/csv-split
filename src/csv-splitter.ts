import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

// Configuration interface
export interface SplitOptions {
  linesPerFile: number;
  fileNamePattern: string;
}

// Default options
const DEFAULT_OPTIONS: SplitOptions = {
  linesPerFile: 100000, // According to specification, default is 100,000
  fileNamePattern: "{name}_{num}.csv",
};

/**
 * Check if a line is likely a CSV header or data row (contains commas)
 * @param line The line to check
 * @returns True if the line contains commas, false otherwise
 */
export function isCsvLine(line: string): boolean {
  return line.includes(",");
}

/**
 * Generate output file name based on pattern
 * @param pattern The filename pattern
 * @param baseName The original file name (without extension)
 * @param sequenceNumber The sequence number for the current file
 * @returns The formatted file name
 */
export function formatFileName(
  pattern: string,
  baseName: string,
  sequenceNumber: number
): string {
  const paddedNum = sequenceNumber.toString().padStart(3, "0");
  return pattern.replace("{name}", baseName).replace("{num}", paddedNum);
}

/**
 * Split a CSV file into multiple smaller files
 * @param filePath Path to the CSV file to split
 * @param outputDir Directory where output files will be saved
 * @param options Configuration options
 */
export async function splitCsvFile(
  filePath: string,
  outputDir: string,
  options?: Partial<SplitOptions>
): Promise<void> {
  // Merge default options with provided options
  const config: SplitOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Get the base name of the file (without extension) to use in output file names
  const baseName = path.basename(filePath, ".csv");

  // Create a readable stream from the input file
  const fileStream = fs.createReadStream(filePath);

  // Create readline interface to read the file line by line
  const rl = readline.createInterface({
    input: fileStream,
  });

  let csvStarted = false;
  let lineCount = 0;
  let fileCount = 1;
  let header: string | null = null;
  let writeStream: fs.WriteStream | null = null;
  let metadataLineCount = 0;

  for await (const line of rl) {
    // Skip metadata headers until we find a CSV line (has commas)
    if (!csvStarted) {
      if (!isCsvLine(line)) {
        metadataLineCount++;
        continue;
      }
      // First CSV line found - this is the header
      csvStarted = true;
      header = line;
    }

    // Create a new write stream when needed
    if (
      writeStream === null ||
      (lineCount > 0 && lineCount % config.linesPerFile === 0)
    ) {
      if (writeStream !== null) {
        writeStream.end(); // Close the previous stream
      }

      // Generate output file name
      const fileName = formatFileName(
        config.fileNamePattern,
        baseName,
        fileCount
      );
      const outputFilePath = path.join(outputDir, fileName);

      console.log(`Creating file: ${outputFilePath}`);
      writeStream = fs.createWriteStream(outputFilePath);

      // Write the header to each new file
      if (header !== null) {
        writeStream.write(`${header}\n`);
      }

      fileCount++;
    }

    // Write the current line to the output file
    // Skip writing the header line again (it's already written when creating the file)
    if (csvStarted && lineCount === 0) {
      // This is the header line, already written when creating the file
      // Do nothing, just increment lineCount later
    } else {
      if (writeStream) {
        writeStream.write(`${line}\n`);
      }
    }

    lineCount++;
  }

  // Close the last write stream if it exists
  if (writeStream !== null) {
    writeStream.end();
  }

  console.log(
    `Split ${path.basename(filePath)} into ${
      fileCount - 1
    } files with approximately ${
      config.linesPerFile
    } lines per file (excluding header).`
  );

  if (metadataLineCount > 0) {
    console.log(
      `Discarded ${metadataLineCount} metadata line(s) from the beginning of the file.`
    );
  }
}
