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
  return 'println!("{}", ' + msg + ');\n';
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

export function text_replace(block: Block, generator: RustGenerator): [string, number] {
  // Replace all occurrences of a substring within a string.
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_NONE) || 'String::new()';
  const from = generator.valueToCode(block, 'FROM', generator.ORDER_NONE) || '""';
  const to = generator.valueToCode(block, 'TO', generator.ORDER_NONE) || '""';

  const functionName = generator.provideFunction_(
      'text_replace_helper',
      [
        `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(original: &str, from_str: &str, to_str: &str) -> String {`,
        `    original.replace(from_str, to_str)`,
        `}`
      ]);
  const code = `${functionName}(&(${text}).to_string(), &(${from}).to_string(), &(${to}).to_string())`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function text_reverse(block: Block, generator: RustGenerator): [string, number] {
  // Reverse the string.
  const text = generator.valueToCode(block, 'TEXT', generator.ORDER_NONE) || 'String::new()';
  const functionName = generator.provideFunction_(
      'text_reverse_helper',
      [
        `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(s: &str) -> String {`,
        `    s.chars().rev().collect::<String>()`,
        `}`
      ]);
  const code = `${functionName}(&(${text}).to_string())`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function text_append(block: Block, generator: RustGenerator): string {
  // Append to a variable in place.
  const varName = generator.nameDB_!.getName(block.getFieldValue('VAR'),
      NameType.VARIABLE);
  const value = generator.valueToCode(block, 'TEXT',
      generator.ORDER_ASSIGNMENT) || '""';
  // Assuming varName is a mutable String
  return varName + '.push_str(&format!("{}", ' + value + '));\n';
}

export function text_length(block: Block, generator: RustGenerator): [string, number] {
  // String length.
  const text = generator.valueToCode(block, 'VALUE',
      generator.ORDER_MEMBER) || '""';
  return [`${text}.len()`, generator.ORDER_FUNCTION_CALL];
}

export function text_isEmpty(block: Block, generator: RustGenerator): [string, number] {
  // Is the string empty?
  const text = generator.valueToCode(block, 'VALUE',
      generator.ORDER_MEMBER) || '""';
  return [`${text}.is_empty()`, generator.ORDER_FUNCTION_CALL];
}

export function text_indexOf(block: Block, generator: RustGenerator): [string, number] {
  // Search the text for a substring.
  const operator = block.getFieldValue('END') === 'FIRST' ? 'find' : 'rfind';
  const text = generator.valueToCode(block, 'VALUE',
      generator.ORDER_NONE) || '""';
  const sub = generator.valueToCode(block, 'FIND',
      generator.ORDER_NONE) || '""';

  const functionName = generator.provideFunction_(
      `text_${operator}`,
      [
        `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(text: &str, sub: &str) -> usize {`,
        `    match text.${operator}(sub) {`,
        `        Some(i) => i + 1, // Blockly is 1-indexed, Rust is 0-indexed`,
        `        None => 0,    // Blockly returns 0 if not found`,
        `    }`,
        `}`
      ]);
  const code = `${functionName}(${text}, ${sub})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function text_getSubstring(block: Block, generator: RustGenerator): [string, number] {
  const text = generator.valueToCode(block, 'STRING',
      generator.ORDER_NONE) || '""';
  const where1 = block.getFieldValue('WHERE1');
  const where2 = block.getFieldValue('WHERE2');

  const at1_val = generator.valueToCode(block, 'AT1', generator.ORDER_NONE) || '1';
  const at2_val = generator.valueToCode(block, 'AT2', generator.ORDER_NONE) || '1';

  const functionName = generator.provideFunction_(
      'text_get_substring',
      [
        `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(`,
        `    text: &str,`,
        `    where1_str: &str, at1_val: usize, /* 1-indexed for FROM_START/END */`,
        `    where2_str: &str, at2_val: usize  /* 1-indexed for FROM_START/END */`,
        `) -> String {`,
        `    let chars_coll: Vec<char> = text.chars().collect();`,
        `    let len = chars_coll.len();`,
        `    if len == 0 {`,
        `        return String::new();`,
        `    }`,
        ``,
        `    let get_index = |where_opt: &str, at_opt: usize, length: usize| -> usize { // Returns 0-indexed`,
        `        match where_opt {`,
        `            "FIRST" => 0,`,
        `            "LAST" => length - 1,`,
        `            "FROM_START" => {`,
        `                if at_opt > 0 && at_opt <= length { at_opt - 1 } else { length } // Default to end if out of bounds`,
        `            }`,
        `            "FROM_END" => {`,
        `                if at_opt > 0 && at_opt <= length { length - at_opt } else { 0 } // Default to start if out of bounds`,
        `            }`,
        `            _ => length, // Should not happen`,
        `        }`,
        `    };`,
        ``,
        `    let mut start_index = get_index(where1_str, at1_val, len);`,
        `    let mut end_index = get_index(where2_str, at2_val, len);`,
        ``,
        `    // Ensure start_index is not after end_index.`,
        `    if start_index > end_index {`,
        `        std::mem::swap(&mut start_index, &mut end_index);`,
        `    }`,
        `    `,
        `    // Ensure indices are within bounds [0, len-1]`,
        `    // If len is 0, start_index and end_index will be 0 from get_index logic for LAST or FROM_END with at_opt > len.`,
        `    // However, the initial check \`if len == 0\` handles this.`,
        `    // For substring, end_index is exclusive in Rust slices, so it can be \`len\`.`,
        `    // But since we are collecting chars and then slicing, we need end_index to be inclusive for the char vec.`,
        `    `,
        `    if start_index >= len { // If start is out of bounds (e.g. text is empty, or FROM_START with at > len)`,
        `        return String::new();`,
        `    }`,
        `    // end_index is inclusive for the slice of chars_coll.`,
        `    // So, it should be at most len - 1.`,
        `    // If end_index was calculated to be len (e.g. FROM_START with at > len for where2), adjust it.`,
        `    if end_index >= len {`,
        `        end_index = len -1;`,
        `    }`,
        ``,
        ``,
        `    // If after adjustments, start_index is still greater than end_index (e.g. both were out of bounds differently)`,
        `    // or if start_index is past the valid range.`,
        `    if start_index > end_index || start_index >= len {`,
        `        return String::new();`,
        `    }`,
        ``,
        `    // Substring is inclusive of end_index for the collected chars.`,
        `    chars_coll[start_index..=end_index].iter().collect::<String>()`,
        `}`
      ]);

  // Ensure 'at' expressions result in usize.
  const at1_final = /^\d+$/.test(at1_val) ? `${at1_val}_usize` : `(${at1_val}) as usize`;
  const at2_final = /^\d+$/.test(at2_val) ? `${at2_val}_usize` : `(${at2_val}) as usize`;

  const code = `${functionName}(${text}, "${where1}", ${at1_final}, "${where2}", ${at2_final})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function text_changeCase(block: Block, generator: RustGenerator): [string, number] {
  const OPERATORS = {
    'UPPERCASE': '.to_uppercase()',
    'LOWERCASE': '.to_lowercase()',
    'TITLECASE': null,
  };
  const operator = OPERATORS[block.getFieldValue('CASE') as keyof typeof OPERATORS];
  const text = generator.valueToCode(block, 'TEXT',
      generator.ORDER_MEMBER) || '""';
  let code;
  if (operator) {
    code = `${text}${operator}`;
  } else { // TITLECASE
    const functionName = generator.provideFunction_(
        'text_to_title_case',
        [
          `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(s: &str) -> String {`,
          `    let mut result = String::new();`,
          `    let mut capitalize_next = true;`,
          `    for c in s.chars() {`,
          `        if c.is_alphabetic() {`,
          `            if capitalize_next {`,
          `                result.push(c.to_uppercase().next().unwrap_or(c));`,
          `                capitalize_next = false;`,
          `            } else {`,
          `                result.push(c.to_lowercase().next().unwrap_or(c));`,
          `            }`,
          `        } else {`,
          `            result.push(c);`,
          `            capitalize_next = true; // Capitalize after non-alphabetic chars (e.g. space, hyphen)`,
          `        }`,
          `    }`,
          `    result`,
          `}`
        ]);
    code = `${functionName}(${text})`;
  }
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function text_trim(block: Block, generator: RustGenerator): [string, number] {
  const OPERATORS = {
    'LEFT': '.trim_start()',
    'RIGHT': '.trim_end()',
    'BOTH': '.trim()',
  };
  const operator = OPERATORS[block.getFieldValue('MODE') as keyof typeof OPERATORS];
  const text = generator.valueToCode(block, 'TEXT',
      generator.ORDER_MEMBER) || '""';
  return [`${text}${operator}`, generator.ORDER_FUNCTION_CALL];
}

export function text_prompt_ext(block: Block, generator: RustGenerator): [string, number] {
  const msg = generator.quote_(block.getFieldValue('TEXT'));
  const type = block.getFieldValue('TYPE'); // "TEXT" or "NUMBER"
  let code: string;

  // Common print part
  const printCode = `print!("{}", ${msg});\n    std::io::stdout().flush().unwrap();`;

  if (type === 'TEXT') {
    const functionName = generator.provideFunction_(
        'text_prompt_text',
        [
          `use std::io::{self, Write};`,
          `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(prompt_msg: &str) -> String {`,
          `    ${printCode}`,
          `    let mut input = String::new();`,
          `    match io::stdin().read_line(&mut input) {`,
          `        Ok(_) => input.trim_end().to_string(),`,
          `        Err(_) => String::new(), // Error reading line`,
          `    }`,
          `}`
        ]);
    code = `${functionName}(${msg})`;
    return [code, generator.ORDER_FUNCTION_CALL];
  } else { // NUMBER
    const functionName = generator.provideFunction_(
        'text_prompt_number',
        [
          `use std::io::{self, Write};`,
          `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(prompt_msg: &str) -> f64 { // Assuming f64 for numbers`,
          `    ${printCode}`,
          `    let mut input = String::new();`,
          `    match io::stdin().read_line(&mut input) {`,
          `        Ok(_) => {`,
          `            match input.trim().parse::<f64>() {`,
          `                Ok(num) => num,`,
          `                Err(_) => 0.0, // Error parsing number, default to 0`,
          `            }`,
          `        }`,
          `        Err(_) => 0.0, // Error reading line, default to 0`,
          `    }`,
          `}`
        ]);
    code = `${functionName}(${msg})`;
    return [code, generator.ORDER_FUNCTION_CALL];
  }
}

export function text_charAt(block: Block, generator: RustGenerator): [string, number] {
  const where = block.getFieldValue('WHERE') || 'FROM_START';
  const text = generator.valueToCode(block, 'VALUE', generator.ORDER_NONE) || '""';

  const helperFunctionName = 'text_char_at'; // Base name for provideFunction_
  const functionName = generator.provideFunction_(
      helperFunctionName,
      [
        `fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(text: &str, where_str: &str, at_val: usize /* 1-indexed for FROM_START/END */) -> String {`,
        `    // Ensure rand crate is available if RANDOM is used.`,
        `    // Add "rand = \\"0.8\\"" (or similar version) to Cargo.toml if not already present.`,
        `    use rand::Rng;`,
        ``,
        `    let chars_coll: Vec<char> = text.chars().collect();`,
        `    if chars_coll.is_empty() {`,
        `        return String::new();`,
        `    }`,
        `    let len = chars_coll.len();`,
        `    // This check is mostly defensive as chars_coll.is_empty() should cover it.`,
        `    if len == 0 { return String::new(); } `,
        ``,
        `    let mut effective_idx: Option<usize> = None; // 0-indexed`,
        ``,
        `    match where_str {`,
        `        "FIRST" => effective_idx = Some(0),`,
        `        "LAST" => effective_idx = Some(len - 1),`,
        `        "FROM_START" => {`,
        `            // at_val is 1-indexed from block.`,
        `            if at_val > 0 && at_val <= len {`,
        `                effective_idx = Some(at_val - 1);`,
        `            }`,
        `        }`,
        `        "FROM_END" => {`,
        `            // at_val is 1-indexed from block.`,
        `            if at_val > 0 && at_val <= len {`,
        `                effective_idx = Some(len - at_val);`,
        `            }`,
        `        }`,
        `        "RANDOM" => {`,
        `            let mut rng = rand::thread_rng();`,
        `            effective_idx = Some(rng.gen_range(0..len));`,
        `        }`,
        `        _ => {} // Should not happen, results in None -> empty string`,
        `    }`,
        ``,
        `    match effective_idx {`,
        `        Some(idx) => {`,
        `             // Final check, idx must be < len.`,
        `             if idx < len { // This check is important.`,
        `                chars_coll[idx].to_string()`,
        `             } else {`,
        `                // This case could happen if len is 0 and RANDOM was chosen,`,
        `                // or if somehow an out-of-bounds index was computed.`,
        `                String::new()`,
        `             }`,
        `        }`,
        `        None => String::new(), // e.g. at_val was out of bounds for FROM_START/END.`,
        `    }`,
        `}`
      ]);

  let code: string;
  if (where === 'FIRST' || where === 'LAST' || where === 'RANDOM') {
    // 'at' argument is not used by the helper for these cases, pass a dummy value (e.g., 1).
    code = `${functionName}(${text}, "${where}", 1_usize)`;
  } else { // FROM_START, FROM_END
    let at_expression = generator.valueToCode(block, 'AT', generator.ORDER_NONE) || '1';
    // Ensure the 'at' expression results in usize.
    // If 'at_expression' is a literal number, append '_usize'. Otherwise, cast with 'as usize'.
    let final_at_expression: string;
    if (/^\\d+$/.test(at_expression)) {
      final_at_expression = `${at_expression}_usize`;
    } else {
      // Assuming 'at_expression' yields a type that can be cast to usize (e.g., i32, u32).
      // Casting negative numbers to usize can lead to very large usize values,
      // but Blockly's 'AT' input typically expects non-negative indices.
      // The helper function's logic (at_val > 0) should guard against issues from 0 or large values from negative casts.
      final_at_expression = `(${at_expression}) as usize`;
    }
    code = `${functionName}(${text}, "${where}", ${final_at_expression})`;
  }

  return [code, generator.ORDER_FUNCTION_CALL];
}
