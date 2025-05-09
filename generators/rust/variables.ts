/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for variable blocks.
 */

// Former goog.module ID: Blockly.Rust.variables

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';
import {NameType} from '../../core/names.js'; // NameType is an enum from core

export function variables_get(block: Block, generator: RustGenerator): [string, number] {
  // Variable getter.
  const code = generator.nameDB_!.getName(block.getFieldValue('VAR'), NameType.VARIABLE);
  return [code, generator.ORDER_ATOMIC];
}

export function variables_set(block: Block, generator: RustGenerator): string {
  // Variable setter.
  const argument0 = generator.valueToCode(block, 'VALUE',
      generator.ORDER_ASSIGNMENT) || '0'; 
  const varName = generator.nameDB_!.getName(block.getFieldValue('VAR'), NameType.VARIABLE);
  // TODO: Handle variable types and declaration vs assignment properly.
  return 'let mut ' + varName + ' = ' + argument0 + ';\\n';
}
