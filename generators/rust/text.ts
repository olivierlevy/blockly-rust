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
import {NameType} from '../../core/names.js';

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

export function text_join(block: Block, generator: RustGenerator): [string, number] {
  // Create a string made up of any number of elements of any type.
  // TODO: This will need type conversion for non-string inputs in Rust.
  // For now, assumes all inputs are string-compatible or have Display trait.
  let code;
  const itemCount = (block as any).itemCount_ as number; // Cast to any to access itemCount_
  if (itemCount === 0) {
    return ['String::new()', generator.ORDER_FUNCTION_CALL];
  } else if (itemCount === 1) {
    const element = generator.valueToCode(block, 'ADD0',
        generator.ORDER_NONE) || '""';
    // Assuming the element can be converted to String, e.g. using .to_string()
    code = `format!("{}", ${element})`; // Or just element if it's already a String
    return [code, generator.ORDER_FUNCTION_CALL];
  } else {
    const elements = [];
    for (let i = 0; i < itemCount; i++) { // Use itemCount variable
      elements[i] = generator.valueToCode(block, 'ADD' + i,
          generator.ORDER_NONE) || '""';
    }
    // Using format! macro for joining
    const formatString = elements.map(() => "{}").join("");
    code = `format!("${formatString}", ${elements.join(', ')})`;
    return [code, generator.ORDER_FUNCTION_CALL];
  }
}

export function text_append(block: Block, generator: RustGenerator): string {
  // Append to a variable in place.
  const varName = generator.nameDB_!.getName(block.getFieldValue('VAR'),
      NameType.VARIABLE);
  const value = generator.valueToCode(block, 'TEXT',
      generator.ORDER_ASSIGNMENT) || '""';
  // Assuming varName is a mutable String
  return varName + '.push_str(&format!("{}", ' + value + '));\\n';
}
