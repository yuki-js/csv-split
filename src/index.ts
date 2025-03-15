#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { Command } from "commander";
import { splitCsvFile } from "./csv-splitter";
import { version } from "../package.json";

// Default configuration
const DEFAULT_LINES_PER_FILE = 100000; // According to specification, default is 100,000

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("csv-split")
    .description("Split large CSV files into smaller, more manageable chunks")
    .version(version)
    .argument("<directory>", "Directory containing CSV files to split")
    .option(
      "-l, --lines <number>",
      "Number of lines per output file",
      String(DEFAULT_LINES_PER_FILE)
    )
    .option(
      "-o, --output <directory>",
      "Custom output directory (default: <input>/outs)"
    )
    .option(
      "-p, --pattern <pattern>",
      "Output filename pattern (default: {name}_{num}.csv)"
    )
    .action(async (inputDir: string, options) => {
      // Parse options
      const linesPerFile = parseInt(options.lines, 10);
      const outputDir = options.output || path.join(inputDir, "outs");
      const pattern = options.pattern || "{name}_{num}.csv";

      // Validate that the input directory exists
      if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
        console.error(
          `The input directory '${inputDir}' does not exist or is not a directory.`
        );
        process.exit(1);
      }

      // Create the output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Get all CSV files in the input directory (excluding the 'outs' directory)
      const files = fs.readdirSync(inputDir);
      const csvFiles = files.filter((file) => {
        const filePath = path.join(inputDir, file);
        const isDirectory = fs.statSync(filePath).isDirectory();
        const isCsv = file.toLowerCase().endsWith(".csv");
        return !isDirectory && isCsv;
      });

      if (csvFiles.length === 0) {
        console.log(`No CSV files found in ${inputDir}`);
        return;
      }

      console.log(`Found ${csvFiles.length} CSV file(s) to split.`);

      // Process each CSV file
      for (const csvFile of csvFiles) {
        const filePath = path.join(inputDir, csvFile);
        console.log(`Splitting file: ${csvFile}`);
        await splitCsvFile(filePath, outputDir, {
          linesPerFile,
          fileNamePattern: pattern,
        });
      }

      console.log("All files have been processed.");
    });

  await program.parseAsync();
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
