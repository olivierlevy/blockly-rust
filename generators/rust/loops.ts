/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for loop blocks.
 */

// Former goog.module ID: Blockly.Rust.loops

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';
import {NameType} from '../../core/names.js';

export function controls_repeat_ext(block: Block, generator: RustGenerator): string {
  // Repeat n times.
  let repeats;
  if (block.getField('TIMES')) {
    // Internal number.
    repeats = String(Number(block.getFieldValue('TIMES')));
  } else {
    // External number.
    repeats = generator.valueToCode(block, 'TIMES',
        generator.ORDER_NONE) || '0';
  }
  // TODO: Ensure repeats is a valid usize or integer type for Rust's range.
  // If it's a variable, it might need to be cast or ensured it's an integer type.
  // For now, assuming it evaluates to an integer.
  
  let branch = generator.statementToCode(block, 'DO');
  if (branch) {
    branch = generator.prefixLines(branch, generator.INDENT);
  } else {
    branch = '';
  }
  
  // Rust's for loop is `for _ in 0..N { ... }`
  // The variable for the loop counter is often unused if it's just repetition.
  // If a variable is needed, the block would be different (e.g. count with).
  // For `controls_repeat_ext`, `_` is conventional for an unused loop variable.
  const code = 'for _ in 0..' + repeats + ' {\n' + branch + '}\n';
  return code;
}

export function controls_repeat(block: Block, generator: RustGenerator): string {
  // Repeat n times (internal number).
  const repeats = String(Number(block.getFieldValue('TIMES')));
  let branch = generator.statementToCode(block, 'DO');
  if (branch) {
    branch = generator.prefixLines(branch, generator.INDENT);
  } else {
    branch = '';
  }
  const code = 'for _ in 0..' + repeats + ' {\n' + branch + '}\n';
  return code;
}

export function controls_whileUntil(block: Block, generator: RustGenerator): string {
  // Do while/until loop.
  const until = block.getFieldValue('MODE') === 'UNTIL';
  let argument0 = generator.valueToCode(block, 'BOOL',
      until ? generator.ORDER_LOGICAL_NOT : generator.ORDER_NONE) || 'false';
  let branch = generator.statementToCode(block, 'DO');
  if (branch) {
    branch = generator.prefixLines(branch, generator.INDENT);
  } else {
    branch = '';
  }
  if (generator.INFINITE_LOOP_TRAP) {
    branch = generator.prefixLines(generator.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + block.id + '\''), generator.INDENT) + branch;
  }
  if (until) {
    argument0 = '!' + argument0;
  }
  return 'while ' + argument0 + ' {\n' + branch + '}\n';
}

export function controls_for(block: Block, generator: RustGenerator): string {
  // For loop.
  const variable0 = generator.nameDB_!.getName(
      block.getFieldValue('VAR'), NameType.VARIABLE);
  const argument0 = generator.valueToCode(block, 'FROM',
      generator.ORDER_NONE) || '0';
  const argument1 = generator.valueToCode(block, 'TO',
      generator.ORDER_NONE) || '0';
  const increment = generator.valueToCode(block, 'BY',
      generator.ORDER_NONE) || '1';
  
  let branch = generator.statementToCode(block, 'DO');
  if (branch) {
    branch = generator.prefixLines(branch, generator.INDENT);
  } else {
    branch = '';
  }

  if (generator.INFINITE_LOOP_TRAP) {
    branch = generator.prefixLines(generator.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + block.id + '\''), generator.INDENT) + branch;
  }

  // TODO: Add type handling for range and step values. Assuming integers for now.
  // Rust's range for `for` loops is typically `start..end` (exclusive) or `start..=end` (inclusive).
  // Blockly's `controls_for` is usually inclusive for the TO value.
  // The `step_by` method can be used for custom increments.
  
  let code = '';
  // A common way to handle general C-style for loops if step is not 1 or is negative
  // is to use a `loop` with manual adjustments. However, `step_by` is quite flexible.
  // Let's assume positive step for now.
  // If step is 1:
  //   for i in from..=to { ... }
  // If step is other_positive_value:
  //   for i in (from..=to).step_by(step) { ... }
  // If step is negative, or FROM > TO with positive step, or FROM < TO with negative step,
  // the range logic needs care. (e.g. `(to..=from).rev().step_by(abs_step)` for reverse)

  // Simple case: assume argument0, argument1, increment are numeric strings or variables.
  // And increment is positive.
  if (increment === '1') {
    code = 'for ' + variable0 + ' in ' + argument0 + '..=' + argument1 + ' {\n' +
        branch + '}\n';
  } else {
    // Using .step_by(). Note: this requires the range to be an iterator.
    // (start..=end) creates an `std::ops::RangeInclusive`.
    code = 'for ' + variable0 + ' in (' + argument0 + '..=' + argument1 + ').step_by(' + increment + ' as usize) {\n' +
        branch + '}\n';
    // Added `as usize` for step, assuming step is an integer. Range values also likely need to be usize or compatible.
  }
  return code;
}

export function controls_forEach(block: Block, generator: RustGenerator): string {
  // For each loop.
  const variable0 = generator.nameDB_!.getName(
      block.getFieldValue('VAR'), NameType.VARIABLE);
  const argument0 = generator.valueToCode(block, 'LIST',
      generator.ORDER_NONE) || 'Vec::new()'; // Default to an empty vector if list is not provided

  let branch = generator.statementToCode(block, 'DO');
  if (branch) {
    branch = generator.prefixLines(branch, generator.INDENT);
  } else {
    branch = '';
  }
  if (generator.INFINITE_LOOP_TRAP) {
    branch = generator.prefixLines(generator.INFINITE_LOOP_TRAP.replace(/%1/g,
        '\'' + block.id + '\''), generator.INDENT) + branch;
  }
  // Assuming argument0 is an expression that yields an iterable collection.
  // .iter() is common for borrowing iteration. .into_iter() for consuming.
  // Let's use .iter() for non-mutating iteration by default.
  const code = 'for ' + variable0 + ' in ' + argument0 + '.iter() {\n' +
      branch + '}\n';
  return code;
}

export function controls_flow_statements(block: Block, generator: RustGenerator): string {
  // Flow statements: break, continue.
  switch (block.getFieldValue('FLOW')) {
    case 'BREAK':
      return 'break;\n';
    case 'CONTINUE':
      return 'continue;\n';
  }
  throw Error('Unknown flow statement.');
}
