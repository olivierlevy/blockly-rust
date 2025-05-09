/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for unit test blocks.
 * This will be similar to tests/generators/unittest_python.js
 */
'use strict';

// Assumes rustGenerator is globally available when this script is loaded.
// (It's made global in tests/generators/index.html's module script)

if (typeof rustGenerator === 'undefined') {
  console.warn('unittest_rust.js: rustGenerator is not defined. Skipping block definitions.');
} else {
  rustGenerator.forBlock['unittest_main'] = function(block) {
    // Container for unit tests.
    // Unlike Python, Rust doesn't have a dynamic list to append results to easily
    // without more complex setup (like macros or passing a mutable vec).
    // For now, just generate the contained statements.
    // A more complete implementation might set up a test harness.
    var statements = rustGenerator.statementToCode(block, 'DO');
    // Could wrap in a test function:
    // return '#[test]\\nfn generated_test() {\\n' + statements + '}\\n';
    // Or if part of a larger main:
    // return statements; 
    // For direct comparison with other generators' output structure in golden files,
    // often the unittest_main just outputs the statements.
    return statements;
  };

  // TODO: Implement Rust generators for other unittest blocks:
  // unittest_assertequals
  // unittest_assertvalue
  // unittest_fail
  // unittest_adjustindex
  // These will require defining Rust helper functions or macros for assertions.
}
