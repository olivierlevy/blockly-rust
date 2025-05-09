/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for logic blocks.
 */

// Former goog.module ID: Blockly.Rust.logic

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';
// Removed import {Order} as it's part of the generator instance.

export function controls_if(block: Block, generator: RustGenerator): string {
  // If/elseif/else condition.
  let n = 0;
  let code = '';
  let conditionCode, branchCode;

  do {
    conditionCode = generator.valueToCode(block, 'IF' + n, generator.ORDER_NONE) || 'false';
    branchCode = generator.statementToCode(block, 'DO' + n);
    if (branchCode) {
      branchCode = generator.prefixLines(branchCode, generator.INDENT);
    } else {
      branchCode = ''; // Ensure it's an empty string if no statements
    }
    code += (n > 0 ? ' else ' : '') +
        'if ' + conditionCode + ' {\\n' +
        branchCode +
        '}\\n';
    n++;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE')) {
    branchCode = generator.statementToCode(block, 'ELSE');
    if (branchCode) {
      branchCode = generator.prefixLines(branchCode, generator.INDENT);
    } else {
      branchCode = '';
    }
    code += 'else {\\n' +
        branchCode +
        '}\\n';
  }
  return code;
}

export function logic_compare(block: Block, generator: RustGenerator): [string, number] {
  // Comparison operator.
  const OPERATORS: {[key: string]: string} = {
    'EQ': '==',
    'NEQ': '!=',
    'LT': '<',
    'LTE': '<=',
    'GT': '>',
    'GTE': '>='
  };
  const operator = OPERATORS[block.getFieldValue('OP')];
  const order = (operator === '==' || operator === '!=') ?
      generator.ORDER_EQUALITY : generator.ORDER_RELATIONAL;
  const argument0 = generator.valueToCode(block, 'A', order) || '0';
  const argument1 = generator.valueToCode(block, 'B', order) || '0';
  const code = argument0 + ' ' + operator + ' ' + argument1;
  return [code, order];
}

export function logic_boolean(block: Block, generator: RustGenerator): [string, number] {
  // Boolean values true and false.
  const code = (block.getFieldValue('BOOL') === 'TRUE') ? 'true' : 'false';
  return [code, generator.ORDER_ATOMIC];
}
