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
  return new Promise((resolve, reject) => {
    try {
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
      let header: string | null = null;
      let metadataLineCount = 0;
      const dataLines: string[] = [];
      const writeStreams: fs.WriteStream[] = [];

      rl.on("line", (line) => {
        // Skip metadata headers until we find a CSV line (has commas)
        if (!csvStarted) {
          if (!isCsvLine(line)) {
            metadataLineCount++;
            return;
          }
          // First CSV line found - this is the header
          csvStarted = true;
          header = line;
        } else {
          // Store data lines (skip the header)
          dataLines.push(line);
        }
      });

      rl.on("close", () => {
        // Process the data lines and write to files
        if (dataLines.length === 0) {
          // No data lines, just resolve
          console.log(
            `Split ${path.basename(filePath)} into 0 files with approximately ${
              config.linesPerFile
            } lines per file (excluding header).`
          );

          if (metadataLineCount > 0) {
            console.log(
              `Discarded ${metadataLineCount} metadata line(s) from the beginning of the file.`
            );
          }

          resolve();
          return;
        }

        // Calculate how many files we need
        const totalFiles = Math.ceil(dataLines.length / config.linesPerFile);

        // Create files with data
        for (let i = 0; i < totalFiles; i++) {
          const startIdx = i * config.linesPerFile;
          const endIdx = Math.min(
            (i + 1) * config.linesPerFile,
            dataLines.length
          );
          const fileDataLines = dataLines.slice(startIdx, endIdx);

          // Generate output file name
          const fileName = formatFileName(
            config.fileNamePattern,
            baseName,
            i + 1
          );
          const outputFilePath = path.join(outputDir, fileName);

          console.log(`Creating file: ${outputFilePath}`);
          const writeStream = fs.createWriteStream(outputFilePath);
          writeStreams.push(writeStream);

          // Write the header to each file
          if (header !== null) {
            writeStream.write(`${header}\n`);
          }

          // Write the data lines
          for (const dataLine of fileDataLines) {
            writeStream.write(`${dataLine}\n`);
          }

          // Close the stream
          writeStream.end();
        }

        console.log(
          `Split ${path.basename(
            filePath
          )} into ${totalFiles} files with approximately ${
            config.linesPerFile
          } lines per file (excluding header).`
        );

        if (metadataLineCount > 0) {
          console.log(
            `Discarded ${metadataLineCount} metadata line(s) from the beginning of the file.`
          );
        }

        // Wait for all write streams to finish
        let closedStreams = 0;
        if (writeStreams.length === 0) {
          resolve();
          return;
        }

        writeStreams.forEach((stream) => {
          stream.on("finish", () => {
            closedStreams++;
            if (closedStreams === writeStreams.length) {
              resolve();
            }
          });
          stream.on("error", (err) => {
            reject(err);
          });
        });
      });

      rl.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
