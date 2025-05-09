/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for text blocks.
 */

// Former goog.module ID: Blockly.Rust.texts

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';

export function text(block: Block, generator: RustGenerator): [string, number] {
  // Text value.
  const code = generator.quote_(block.getFieldValue('TEXT'));
  return [code, generator.ORDER_ATOMIC];
}

export function text_print(block: Block, generator: RustGenerator): string {
  // Print statement.
  const msg = generator.valueToCode(block, 'TEXT', generator.ORDER_NONE) || '""';
  // Note: Rust's println! macro handles various types.
  // Basic implementation assumes the input evaluates to something displayable.
  return 'println!("{}", ' + msg + ');\\n';
}
