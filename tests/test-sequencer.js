/**
 * Custom Test Sequencer
 * 
 * This bypasses the @jest/test-sequencer module resolution issue
 */

// Try to require from nested location first
let Sequencer;
try {
  Sequencer = require('@jest/test-sequencer').default;
} catch (e) {
  try {
    Sequencer = require('../../node_modules/jest-cli/node_modules/@jest/test-sequencer').default;
  } catch (e2) {
    // Fallback: create a minimal sequencer with all required methods
    class MinimalSequencer {
      sort(tests) {
        return tests;
      }
      cacheResults(tests, results) {
        // No-op: just satisfy the interface
      }
    }
    module.exports = MinimalSequencer;
    return;
  }
}

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Run tests in the order they were found
    return tests;
  }
  
  cacheResults(tests, results) {
    // Call parent if it exists, otherwise no-op
    if (super.cacheResults) {
      super.cacheResults(tests, results);
    }
  }
}

module.exports = CustomSequencer;
