/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for math blocks.
 */

// Former goog.module ID: Blockly.Rust.math

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';

export function math_number(block: Block, generator: RustGenerator): [string, number] {
  // Numeric value.
  const code = String(block.getFieldValue('NUM'));
  return [code, generator.ORDER_ATOMIC];
}

export function math_arithmetic(block: Block, generator: RustGenerator): [string, number] {
  // Basic arithmetic operators, and power.
  const OPERATORS: {[key: string]: [string | null, number]} = {
    'ADD': [' + ', generator.ORDER_ADDITION],
    'MINUS': [' - ', generator.ORDER_SUBTRACTION],
    'MULTIPLY': [' * ', generator.ORDER_MULTIPLICATION],
    'DIVIDE': [' / ', generator.ORDER_DIVISION],
    'POWER': [null, generator.ORDER_FUNCTION_CALL] // Handled specially for .powf()
  };
  const tuple = OPERATORS[block.getFieldValue('OP')];
  const operator = tuple[0];
  const order = tuple[1];
  const argument0 = generator.valueToCode(block, 'A', order) || '0';
  const argument1 = generator.valueToCode(block, 'B', order) || '0';
  let code;
  if (!operator) { // POWER case
    code = `${argument0}.powf(${argument1})`;
  } else {
    code = argument0 + operator + argument1;
  }
  return [code, order];
}
