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

  rustGenerator.forBlock['unittest_assertvalue'] = function(block) {
    // Asserts that a value is true, false, or null.
    const message = rustGenerator.valueToCode(block, 'MESSAGE',
        rustGenerator.ORDER_NONE) || '""';
    const actual = rustGenerator.valueToCode(block, 'ACTUAL',
        rustGenerator.ORDER_NONE) || 'false'; // Default to false if not connected
    const expected = block.getFieldValue('EXPECTED');

    let code = '';
    if (expected === 'TRUE') {
      code = 'assert!(' + actual + ', "{} (true)", ' + message + ');\\n';
    } else if (expected === 'FALSE') {
      code = 'assert!(!' + actual + ', "{} (false)", ' + message + ');\\n';
    } else if (expected === 'NULL') {
      // Rust's concept of "null" is typically Option::None or a null pointer.
      // This requires type context. For now, a placeholder or specific check.
      // Assuming Option type for .is_none()
      code = 'assert!(' + actual + '.is_none(), "{} (is_none)", ' + message + '); // Assuming ' + actual + ' is Option<T>\\n';
      // Or, more generically, indicate it's a placeholder:
      // code = '// Asserting ' + actual + ' is NULL (requires type-specific handling in Rust)\\n';
    }
    return code;
  };

  rustGenerator.forBlock['unittest_assertequals'] = function(block) {
    // Asserts that a value equals another value.
    const message = rustGenerator.valueToCode(block, 'MESSAGE',
        rustGenerator.ORDER_NONE) || '""';
    const actual = rustGenerator.valueToCode(block, 'ACTUAL',
        rustGenerator.ORDER_NONE) || '/* Default actual */'; // Needs a sensible default or type awareness
    const expected = rustGenerator.valueToCode(block, 'EXPECTED',
        rustGenerator.ORDER_NONE) || '/* Default expected */'; // Needs a sensible default
    return 'assert_eq!(' + actual + ', ' + expected + ', "{}", ' + message + ');\\n';
  };

  rustGenerator.forBlock['unittest_fail'] = function(block) {
    // Always assert an error.
    const message = rustGenerator.quote_(block.getFieldValue('MESSAGE'));
    return 'panic!("{} (test failed)", ' + message + ');\\n';
  };

  rustGenerator.forBlock['unittest_adjustindex'] = function(block) {
    // Adjust index if using one-based indexing.
    let index = rustGenerator.valueToCode(block, 'INDEX',
        rustGenerator.ORDER_ADDITION) || '0';
    
    // Blockly.utils.string.isNumber is not available here directly.
    // A simple check for numeric literal:
    const isNumericLiteral = /^\d+$/.test(index);

    if (block.workspace.options.oneBasedIndex) {
      if (isNumericLiteral) {
        // If the index is a naked number, adjust it right now.
        // Note: Rust indices are usize. Parsing and +1 might need care with types.
        // For simplicity, direct number manipulation.
        return [String(Number(index) - 1), rustGenerator.ORDER_ATOMIC];
      } else {
        // If the index is dynamic, adjust it in code.
        // Ensure parentheses for correct precedence if index is complex.
        index = '(' + index + ' as usize) - 1'; 
      }
    }
    // If 0-based or already adjusted, return as is or with cast for safety.
    // If not numeric literal and 0-based, ensure it's usize.
    if (!isNumericLiteral && !block.workspace.options.oneBasedIndex) {
        index = '(' + index + ' as usize)';
    }
    // The order depends on whether it was adjusted with arithmetic.
    const order = (index.includes(' - 1') || index.includes(' as usize)')) ? 
                  rustGenerator.ORDER_NONE : // Treat as complex expression if cast/subtracted
                  rustGenerator.ORDER_ADDITION; // Or original order if just a variable
    return [index, order];
  };
}
