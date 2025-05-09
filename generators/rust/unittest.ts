/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for unittest blocks.
 */

// Former goog.module ID: Blockly.Rust.unittest

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';

export function unittest_main(block: Block, generator: RustGenerator): string {
  // Container for unit tests.
  const statements = generator.statementToCode(block, 'DO');
  // For now, just return the statements.
  // Depending on test structure, might wrap in fn main() {} or #[test] fn...
  return statements;
}
