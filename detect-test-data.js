// Script to detect any auto-generating test data in the codebase
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Define patterns that suggest test data generation
const testDataPatterns = [
  /\bmock(Data|Orders|User|Entries|Items)\b/i,
  /\btest(Data|Orders|User|Entries|Items)\b/i,
  /\bdummy(Data|Orders|User|Entries|Items)\b/i,
  /\bfake(Data|Orders|User|Entries|Items)\b/i,
  /\bsample(Data|Orders|User|Entries|Items)\b/i,
  /generateTestData/i,
  /createTestData/i,
  /makeTestData/i,
  /populateTestData/i,
  /\bauto(Generate|Populate|Fill)\b/i,
  /\bJohn Doe\b/,
  /\bJane Smith\b/,
  /example\.com/,
  /test@/,
  /\[.*'test-.*'\]/,
  /Math\.random\(\).*id/
];

// Define file patterns to analyze
const filePatterns = [
  /\.tsx?$/,  // TypeScript files
  /\.jsx?$/,  // JavaScript files
];

// Define directories to skip
const skipDirs = [
  'node_modules',
  '.git',
  '.next',
  'out',
  'dist',
  'build',
  'coverage'
];

// Keep track of findings
const findings = [];

// Check if file matches any of our patterns
function isRelevantFile(filename) {
  return filePatterns.some(pattern => pattern.test(filename));
}

// Scan a file for test data patterns
async function scanFile(filepath) {
  try {
    const content = await readFileAsync(filepath, 'utf8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, lineNum) => {
      testDataPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          matches.push({
            line: lineNum + 1,
            content: line.trim(),
            pattern: pattern.toString().replace(/^\/|\/i?$/g, '')
          });
        }
      });
    });
    
    if (matches.length > 0) {
      findings.push({
        file: filepath,
        matches
      });
    }
  } catch (error) {
    console.error(`Error scanning ${filepath}: ${error.message}`);
  }
}

// Recursively scan a directory
async function scanDir(dir) {
  try {
    const entries = await readdirAsync(dir);
    
    for (const entry of entries) {
      if (skipDirs.includes(entry)) continue;
      
      const fullpath = path.join(dir, entry);
      const stat = await statAsync(fullpath);
      
      if (stat.isDirectory()) {
        await scanDir(fullpath);
      } else if (isRelevantFile(entry)) {
        await scanFile(fullpath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error.message}`);
  }
}

// Main function
async function main() {
  const startTime = Date.now();
  console.log('\n🔍 Starting test data detection scan...');
  
  // Get the root directory from command line or use current directory
  const rootDir = process.argv[2] || '.';
  console.log(`Scanning directory: ${path.resolve(rootDir)}`);
  
  await scanDir(rootDir);
  
  // Generate report
  console.log(`\n📊 Scan complete in ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
  console.log(`Found ${findings.length} files with potential test data generation`);
  
  if (findings.length > 0) {
    console.log('\n🚨 Potential auto-generating test data found:');
    
    findings.forEach(finding => {
      console.log(`\n📁 ${finding.file}`);
      finding.matches.forEach(match => {
        console.log(`   Line ${match.line}: ${match.content.substring(0, 100)}${match.content.length > 100 ? '...' : ''}`);
      });
    });
    
    console.log('\n⚠️ Please review these files to ensure they are not auto-generating test data');
    console.log('   Files with many matches may be using test data for development purposes');
  } else {
    console.log('\n✅ No potential test data generation found');
  }
  
  // Suggest next steps
  console.log('\n🛠 Suggested next steps:');
  console.log('1. Review flagged files for code that automatically generates test data');
  console.log('2. Look for useEffect hooks or initialization code that creates test orders');
  console.log('3. Add conditional checks to ensure test data is only generated in development mode');
  console.log('4. Consider using environment variables to control test data generation');
  console.log('   (e.g., ENABLE_TEST_DATA=true npm run dev)');
}

// Run the script
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
