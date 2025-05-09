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
  const code = 'for _ in 0..' + repeats + ' {\\n' + branch + '}\\n';
  return code;
}
