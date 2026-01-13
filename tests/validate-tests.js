/**
 * Test Validation Script
 * 
 * Validates test files for common issues without running Jest
 */

const fs = require('fs');
const path = require('path');

const testDir = path.resolve(__dirname, '__tests__');
const issues = [];

// Check if test files exist
const testFiles = [
  'trial.test.js',
  'device.test.js',
  'abuse.test.js',
  'license.test.js',
  'concurrency.test.js',
  'stripe.test.js',
  'reconciliation.test.js',
  'failure.test.js'
];

console.log('Validating test files...\n');

testFiles.forEach(file => {
  const filePath = path.join(testDir, file);
  if (!fs.existsSync(filePath)) {
    issues.push(`❌ Missing: ${file}`);
  } else {
    // Check for common issues
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for required imports
    if (!content.includes('require(') && !content.includes('import ')) {
      issues.push(`⚠️  ${file}: No imports found`);
    }
    
    // Check for describe blocks
    if (!content.includes('describe(')) {
      issues.push(`⚠️  ${file}: No describe blocks found`);
    }
    
    // Check for test/it blocks
    if (!content.includes('test(') && !content.includes('it(')) {
      issues.push(`⚠️  ${file}: No test cases found`);
    }
    
    console.log(`✅ ${file} - Structure looks good`);
  }
});

// Check helper files
const helpers = [
  'database.js',
  'factories.js',
  'stripe-mock.js',
  'jwt-helper.js'
];

console.log('\nValidating helper files...\n');

helpers.forEach(file => {
  const filePath = path.join(__dirname, 'helpers', file);
  if (!fs.existsSync(filePath)) {
    issues.push(`❌ Missing helper: ${file}`);
  } else {
    console.log(`✅ helpers/${file} - Exists`);
  }
});

// Check setup file
if (!fs.existsSync(path.join(__dirname, 'setup.js'))) {
  issues.push('❌ Missing: tests/setup.js');
} else {
  console.log('✅ tests/setup.js - Exists');
}

// Summary
console.log('\n' + '='.repeat(50));
if (issues.length === 0) {
  console.log('✅ All test files validated successfully!');
  console.log('\nNext steps:');
  console.log('1. Create test database: CREATE DATABASE visionai_license_test;');
  console.log('2. Run migrations: NODE_ENV=test npm run migrate');
  console.log('3. Run tests: npm test');
} else {
  console.log('⚠️  Issues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
}

process.exit(issues.length > 0 ? 1 : 0);
