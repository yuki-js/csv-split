import * as fs from "fs";
import * as path from "path";
import {
  isCsvLine,
  formatFileName,
  splitCsvFile,
  SplitOptions,
} from "../csv-splitter";

describe("CSV Splitter", () => {
  describe("isCsvLine", () => {
    it("should return true for lines containing commas", () => {
      expect(isCsvLine("id,name,age")).toBe(true);
      expect(isCsvLine("1,John Doe,30")).toBe(true);
    });

    it("should return false for lines without commas", () => {
      expect(isCsvLine("Metadata: This is a header")).toBe(false);
      expect(isCsvLine("No commas here")).toBe(false);
    });
  });

  describe("formatFileName", () => {
    it("should format file name according to pattern", () => {
      expect(formatFileName("{name}_{num}.csv", "data", 1)).toBe(
        "data_001.csv"
      );
      expect(formatFileName("{name}_part_{num}.csv", "users", 42)).toBe(
        "users_part_042.csv"
      );
    });

    it("should handle different sequence number lengths", () => {
      expect(formatFileName("{name}_{num}.csv", "data", 1)).toBe(
        "data_001.csv"
      );
      expect(formatFileName("{name}_{num}.csv", "data", 10)).toBe(
        "data_010.csv"
      );
      expect(formatFileName("{name}_{num}.csv", "data", 100)).toBe(
        "data_100.csv"
      );
    });

    it("should handle custom patterns", () => {
      expect(formatFileName("prefix-{name}-{num}-suffix.csv", "data", 1)).toBe(
        "prefix-data-001-suffix.csv"
      );
      expect(formatFileName("{num}_{name}.csv", "data", 1)).toBe(
        "001_data.csv"
      );
    });
  });

  describe("splitCsvFile integration tests", () => {
    // Flag to control cleanup after tests
    const KEEP_TEST_OUTPUT = process.env.KEEP_TEST_OUTPUT === "true";
    const testOutputDir = path.join(__dirname, "test-output");

    // Create test output directory
    beforeAll(() => {
      if (!fs.existsSync(testOutputDir)) {
        // Create the directory if it doesn't exist
        fs.mkdirSync(testOutputDir, { recursive: true });
      }
    });

    // Clean up before each test
    beforeEach(() => {
      if (!KEEP_TEST_OUTPUT && fs.existsSync(testOutputDir)) {
        // Clean up any existing files
        const files = fs.readdirSync(testOutputDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testOutputDir, file));
        }
      }
    });

    afterAll(() => {
      // Clean up test output directory after all tests
      if (!KEEP_TEST_OUTPUT && fs.existsSync(testOutputDir)) {
        const files = fs.readdirSync(testOutputDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testOutputDir, file));
        }
        fs.rmdirSync(testOutputDir);
      } else if (KEEP_TEST_OUTPUT) {
        console.log(`Test output preserved at: ${testOutputDir}`);
      }
    });

    it("should process CSV files correctly", async () => {
      // Call the function with the fixture file
      await splitCsvFile(
        path.join(__dirname, "fixtures", "sample.csv"),
        testOutputDir,
        { linesPerFile: 2 }
      );

      // Check that specific files exist
      expect(fs.existsSync(path.join(testOutputDir, "sample_001.csv"))).toBe(
        true
      );
      expect(fs.existsSync(path.join(testOutputDir, "sample_002.csv"))).toBe(
        true
      );

      // Verify file content
      const file1Content = fs.readFileSync(
        path.join(testOutputDir, "sample_001.csv"),
        "utf8"
      );
      const file2Content = fs.readFileSync(
        path.join(testOutputDir, "sample_002.csv"),
        "utf8"
      );

      // Check that the header is included in each file
      expect(file1Content).toContain("id,name,age,email");
      expect(file2Content).toContain("id,name,age,email");

      // Check that the data is correctly distributed
      expect(file1Content).toContain("1,John Doe,30,john@example.com");
      expect(file2Content).toContain("3,Bob Johnson,45,bob@example.com");
      expect(file2Content).toContain("4,Alice Brown,35,alice@example.com");
    });

    it("should handle custom options", async () => {
      const options: Partial<SplitOptions> = {
        linesPerFile: 1,
        fileNamePattern: "{name}_chunk_{num}.csv",
      };

      // Call the function with custom options
      await splitCsvFile(
        path.join(__dirname, "fixtures", "sample.csv"),
        testOutputDir,
        options
      );

      // Check that the output files were created
      const outputFiles = fs.readdirSync(testOutputDir);
      expect(outputFiles.length).toBe(10); // 10 data rows, 1 per file

      // Check that the files are named correctly with the custom pattern
      expect(outputFiles).toContain("sample_chunk_001.csv");
      expect(outputFiles).toContain("sample_chunk_002.csv");

      // Verify file content for a few sample files
      const file1Content = fs.readFileSync(
        path.join(testOutputDir, "sample_chunk_001.csv"),
        "utf8"
      );
      const file2Content = fs.readFileSync(
        path.join(testOutputDir, "sample_chunk_002.csv"),
        "utf8"
      );
      const file10Content = fs.readFileSync(
        path.join(testOutputDir, "sample_chunk_010.csv"),
        "utf8"
      );

      // Check that the header is included in each file
      expect(file1Content).toContain("id,name,age,email");
      expect(file2Content).toContain("id,name,age,email");
      expect(file10Content).toContain("id,name,age,email");

      // Check that each file contains exactly one data row (plus header)
      const file1Lines = file1Content.trim().split("\n");
      const file2Lines = file2Content.trim().split("\n");
      const file10Lines = file10Content.trim().split("\n");

      expect(file1Lines.length).toBe(2); // Header + 1 data row
      expect(file2Lines.length).toBe(2); // Header + 1 data row
      expect(file10Lines.length).toBe(2); // Header + 1 data row

      // Check specific data in each file
      expect(file1Content).toContain("1,John Doe,30,john@example.com");
      expect(file2Content).toContain("2,Jane Smith,25,jane@example.com");
      expect(file10Content).toContain("10,Ivy Martinez,27,ivy@example.com");
    });

    it("should handle files with no metadata headers", async () => {
      // Call the function
      await splitCsvFile(
        path.join(__dirname, "fixtures", "no-metadata.csv"),
        testOutputDir
      );

      // Check that the specific file exists

      // Verify that file exists rather than checking content
      expect(
        fs.existsSync(path.join(testOutputDir, "no-metadata_001.csv"))
      ).toBe(true);
    });

    it("should handle empty files", async () => {
      // Call the function
      await splitCsvFile(
        path.join(__dirname, "fixtures", "empty.csv"),
        testOutputDir
      );

      // Check that no output files were created
      const outputFiles = fs.readdirSync(testOutputDir);
      expect(outputFiles.length).toBe(0);
    });
  });
});
