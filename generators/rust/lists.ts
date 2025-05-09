/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for list blocks.
 */

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';

export function lists_create_empty(block: Block, generator: RustGenerator): [string, number] {
  // Create an empty list.
  // For now, defaulting to Vec<String>. A more robust solution for types
  // might involve enums or Box<dyn Any> depending on desired Rust practices.
  return ['Vec::<String>::new()', generator.ORDER_FUNCTION_CALL];
}

export function lists_create_with(block: Block, generator: RustGenerator): [string, number] {
  // Create a list with any number of elements of any type.
  const itemCount = (block as any).itemCount_ as number;
  const elements = new Array(itemCount);
  for (let i = 0; i < itemCount; i++) {
    elements[i] = generator.valueToCode(block, 'ADD' + i,
        generator.ORDER_NONE) || 'String::from("")'; // Default to empty string
  }
  // Assuming elements are convertible to String.
  // Using vec! macro with .to_string() for each element.
  const code = `vec![${elements.map(e => `(${e}).to_string()`).join(', ')}]`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function lists_repeat(block: Block, generator: RustGenerator): [string, number] {
  // Create a list with one element repeated.
  const element = generator.valueToCode(block, 'ITEM',
      generator.ORDER_NONE) || 'String::from("")';
  const repeatCount = generator.valueToCode(block, 'NUM',
      generator.ORDER_NONE) || '0';
  
  // Ensure repeatCount is usize.
  const repeatCountAsUsize = /^\d+$/.test(repeatCount) ? `${repeatCount}_usize` : `(${repeatCount}) as usize`;

  // element.to_string() ensures it's a String, then clone it for repetition.
  const code = `vec![(${element}).to_string(); ${repeatCountAsUsize}]`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function lists_length(block: Block, generator: RustGenerator): [string, number] {
  // String or array length.
  const list = generator.valueToCode(block, 'VALUE',
      generator.ORDER_MEMBER) || 'Vec::<String>::new()';
  return [`${list}.len()`, generator.ORDER_FUNCTION_CALL];
}

export function lists_isEmpty(block: Block, generator: RustGenerator): [string, number] {
  // Is the string null or array empty?
  const list = generator.valueToCode(block, 'VALUE',
      generator.ORDER_MEMBER) || 'Vec::<String>::new()';
  return [`${list}.is_empty()`, generator.ORDER_FUNCTION_CALL];
}

export function lists_indexOf(block: Block, generator: RustGenerator): [string, number] {
  // Find an item in the list.
  const operator = block.getFieldValue('END') === 'FIRST' ?
      'first_index_of' : 'last_index_of';
  const list = generator.valueToCode(block, 'VALUE',
      generator.ORDER_NONE) || 'Vec::<String>::new()';
  const item = generator.valueToCode(block, 'FIND',
      generator.ORDER_NONE) || 'String::from("")';

  // Assuming list is Vec<String> and item is String or &str.
  // Helper function to handle 1-based indexing for Blockly.
  const functionName = generator.provideFunction_(
      `list_${operator}`,
      `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<String>, item: &str) -> usize {
    let mut index: Option<usize> = None;
    if "${operator}" == "first_index_of" {
        for (i, val) in list.iter().enumerate() {
            if val == item {
                index = Some(i + 1); // Blockly is 1-indexed
                break;
            }
        }
    } else { // last_index_of
        for (i, val) in list.iter().enumerate().rev() {
            if val == item {
                index = Some(i + 1); // Blockly is 1-indexed
                break;
            }
        }
    }
    index.unwrap_or(0) // Blockly returns 0 if not found
}`);
  const code = `${functionName}(&${list}, &(${item}).to_string())`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function lists_getIndex(block: Block, generator: RustGenerator): [string, number] | string {
  const mode = block.getFieldValue('MODE') || 'GET'; // GET, GET_REMOVE, REMOVE
  const where = block.getFieldValue('WHERE') || 'FROM_START';
  const list = generator.valueToCode(block, 'VALUE', generator.ORDER_NONE) || 'Vec::<String>::new()';
  const at = generator.valueToCode(block, 'AT', generator.ORDER_NONE) || '1';

  const functionName = generator.provideFunction_(
      'lists_get_index_helper',
      `
use rand::Rng; // For RANDOM option

// Helper to get 0-based index from Blockly's 1-based or keywords
// Returns Option<usize> where None means index is out of bounds for GET/REMOVE
// or specific points for INSERT (e.g. len for insert at end).
fn get_list_effective_index(list_len: usize, where_str: &str, at_val: usize /* 1-indexed */) -> Option<usize> {
    if list_len == 0 {
        return None; // Cannot get/remove from empty list
    }
    match where_str {
        "FIRST" => Some(0),
        "LAST" => Some(list_len - 1),
        "FROM_START" => {
            if at_val > 0 && at_val <= list_len { Some(at_val - 1) } else { None }
        }
        "FROM_END" => {
            if at_val > 0 && at_val <= list_len { Some(list_len - at_val) } else { None }
        }
        "RANDOM" => {
            let mut rng = rand::thread_rng();
            Some(rng.gen_range(0..list_len))
        }
        _ => None, // Should not happen
    }
}

// Main helper for lists_getIndex logic
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(
    list_mut: &mut Vec<String>, // Mutable for REMOVE/GET_REMOVE
    mode_str: &str,
    where_str: &str,
    at_val: usize /* 1-indexed */
) -> String { // Returns String because GET returns an element, REMOVE might not return anything useful for an expression
    let list_len = list_mut.len();
    let effective_idx_opt = get_list_effective_index(list_len, where_str, at_val);

    match effective_idx_opt {
        Some(idx) => {
            match mode_str {
                "GET" => list_mut.get(idx).cloned().unwrap_or_default(), // .cloned() for String, unwrap_or_default for safety
                "GET_REMOVE" => {
                    if idx < list_mut.len() { list_mut.remove(idx) } else { String::new() } // remove returns the element
                }
                "REMOVE" => {
                    if idx < list_mut.len() { list_mut.remove(idx); } // Just remove, no return value needed for statement
                    String::new() // Return dummy for expression context if any
                }
                _ => String::new(), // Should not happen
            }
        }
        None => String::new(), // Index out of bounds or empty list
    }
}`);

  const atFinal = /^\d+$/.test(at) ? `${at}_usize` : `(${at}) as usize`;
  let code = `${functionName}(&mut ${list}, "${mode}", "${where}", ${atFinal})`;

  if (mode === 'GET') {
    return [code, generator.ORDER_FUNCTION_CALL];
  } else if (mode === 'GET_REMOVE') {
    // This operation modifies the list and returns a value.
    // The list variable must be mutable.
    // The generated code calls a helper that mutates and returns.
    return [code, generator.ORDER_FUNCTION_CALL];
  } else { // REMOVE
    // This is a statement.
    return code + ';\\n';
  }
}

export function lists_setIndex(block: Block, generator: RustGenerator): string {
  const listVarName = generator.nameDB_!.getName(block.getFieldValue('LIST'),
      'VARIABLE'); // Assuming the list is a variable
  const mode = block.getFieldValue('MODE') || 'SET'; // SET, INSERT
  const where = block.getFieldValue('WHERE') || 'FROM_START';
  const at = generator.valueToCode(block, 'AT', generator.ORDER_NONE) || '1';
  const value = generator.valueToCode(block, 'TO', generator.ORDER_ASSIGNMENT) || 'String::from("")';

  const functionName = generator.provideFunction_(
      'lists_set_index_helper',
      `
use rand::Rng; // For RANDOM option

// Helper to get 0-based index for SET/INSERT.
// For INSERT, 'at_val' can be list_len to insert at the end.
fn get_list_set_effective_index(list_len: usize, where_str: &str, at_val: usize /* 1-indexed */, is_insert: bool) -> Option<usize> {
    match where_str {
        "FIRST" => Some(0),
        "LAST" => if list_len > 0 { Some(list_len - 1) } else { if is_insert { Some(0) } else { None } }, // Insert at 0 for empty, else last element
        "FROM_START" => {
            // For insert, at_val can be len + 1 (Blockly 1-indexed) to insert at end (0-indexed len)
            if at_val > 0 && at_val <= (list_len + if is_insert {1} else {0}) {
                 if at_val -1 == list_len && !is_insert && list_len > 0 { // Trying to set one past the end
                    None
                 } else if at_val -1 > list_len { // Way out of bounds
                    None
                 }
                 else {
                    Some(at_val - 1)
                 }
            } else { None }
        }
        "FROM_END" => {
            // For insert, at_val can be len + 1 to insert at start (0-indexed 0)
            if at_val > 0 && at_val <= (list_len + if is_insert {1} else {0}) {
                if list_len >= at_val { Some(list_len - at_val) }
                else if is_insert && at_val == list_len + 1 { Some(0) } // Insert at beginning from end
                else { None }
            } else { None }
        }
        "RANDOM" => { // Random for SET replaces a random element. For INSERT, inserts at a random position.
            if list_len == 0 { if is_insert { Some(0) } else { None } }
            else {
                let mut rng = rand::thread_rng();
                if is_insert { Some(rng.gen_range(0..=list_len)) } // Can insert at len
                else { Some(rng.gen_range(0..list_len)) } // Can only set within 0..len-1
            }
        }
        _ => None,
    }
}

// Main helper for lists_setIndex logic
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(
    list_mut: &mut Vec<String>,
    mode_str: &str,
    where_str: &str,
    at_val: usize, /* 1-indexed */
    item_val: String
) {
    let list_len = list_mut.len();
    let is_insert = mode_str == "INSERT";
    let effective_idx_opt = get_list_set_effective_index(list_len, where_str, at_val, is_insert);

    if let Some(idx) = effective_idx_opt {
        if mode_str == "SET" {
            if idx < list_len { // Ensure index is within bounds for setting
                list_mut[idx] = item_val;
            }
        } else { // INSERT
            if idx <= list_len { // Ensure index is valid for insertion (can be list_len)
                list_mut.insert(idx, item_val);
            }
        }
    }
    // If index is None, operation is a no-op (e.g. trying to set out of bounds)
}`);

  const atFinal = /^\d+$/.test(at) ? `${at}_usize` : `(${at}) as usize`;
  // The listVarName must be mutable. This is assumed by the user of the block.
  return `${functionName}(&mut ${listVarName}, "${mode}", "${where}", ${atFinal}, (${value}).to_string());\\n`;
}

export function lists_getSublist(block: Block, generator: RustGenerator): [string, number] {
  const list = generator.valueToCode(block, 'LIST', generator.ORDER_NONE) || 'Vec::<String>::new()';
  const where1 = block.getFieldValue('WHERE1');
  const where2 = block.getFieldValue('WHERE2');
  const at1 = generator.valueToCode(block, 'AT1', generator.ORDER_NONE) || '1';
  const at2 = generator.valueToCode(block, 'AT2', generator.ORDER_NONE) || '1';

  const functionName = generator.provideFunction_(
      'lists_get_sublist_helper',
      `
// Helper to get 0-based index for sublist bounds.
// 'length' is the length of the list.
// 'is_end_index' differentiates start/end logic for FROM_END with at_val=1 (means end of list vs. second to last).
fn get_sublist_effective_index(length: usize, where_str: &str, at_val: usize /* 1-indexed */, is_end_index: bool) -> usize {
    if length == 0 { return 0; } // Or handle as error/empty slice appropriately
    match where_str {
        "FIRST" => 0,
        "LAST" => if length > 0 { length - 1 } else { 0 },
        "FROM_START" => {
            if at_val > 0 {
                let idx = at_val - 1;
                if idx > length { length } // Clamp to length if out of bounds (for exclusive end) or length-1 (for inclusive start)
                else { idx }
            } else { 0 } // Default to start
        }
        "FROM_END" => {
            if at_val > 0 && at_val <= length {
                length - at_val
            } else if at_val > length { // Requesting further than start from end
                0 // Clamp to start
            }
             else { // at_val == 0 or invalid
                if is_end_index { length } else { 0 } // Default based on start/end
            }
        }
        _ => 0, // Should not happen
    }
}

fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(
    list: &Vec<String>,
    where1_str: &str, at1_val: usize, /* 1-indexed */
    where2_str: &str, at2_val: usize  /* 1-indexed */
) -> Vec<String> {
    let len = list.len();
    if len == 0 { return Vec::new(); }

    let mut start_idx = get_sublist_effective_index(len, where1_str, at1_val, false);
    // For end_idx, if it's 'FROM_END' or 'LAST', it's inclusive.
    // If 'FROM_START', it's typically exclusive for slices, but Blockly means inclusive.
    // So, if where2 is FROM_START, at2 means "up to and including element at2".
    // If where2 is FROM_END, at2 means "up to and including element at2 from end".
    // Rust's range a..b is exclusive for b. a..=b is inclusive.
    // We'll calculate an inclusive end_idx first.
    let mut end_idx = get_sublist_effective_index(len, where2_str, at2_val, true);

    if start_idx > end_idx {
        // If start is after end, Blockly typically returns an empty list or handles it gracefully.
        // For Rust, an empty slice is Vec::new() or list[start_idx..start_idx].to_vec() if start_idx is valid.
        return Vec::new();
    }
    
    // Ensure indices are within valid bounds for slicing [0, len-1] for start, [0, len] for end (exclusive)
    // Since we use ..= (inclusive), end_idx must be <= len-1
    start_idx = start_idx.min(len.saturating_sub(1)); // Clamp start_idx to not exceed len-1 (or 0 if len is 0)
    end_idx = end_idx.min(len.saturating_sub(1));     // Clamp end_idx to not exceed len-1

    if start_idx > end_idx || len == 0 { // Re-check after clamping, or if list was empty
        return Vec::new();
    }

    // Slice is [start_idx..=end_idx] (inclusive)
    list.get(start_idx..=end_idx).unwrap_or_default().to_vec()
}`);

  const at1Final = /^\d+$/.test(at1) ? `${at1}_usize` : `(${at1}) as usize`;
  const at2Final = /^\d+$/.test(at2) ? `${at2}_usize` : `(${at2}) as usize`;

  const code = `${functionName}(&${list}, "${where1}", ${at1Final}, "${where2}", ${at2Final})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function lists_sort(block: Block, generator: RustGenerator): [string, number] {
  const list = generator.valueToCode(block, 'LIST',
      generator.ORDER_NONE) || 'Vec::<String>::new()';
  const type = block.getFieldValue('TYPE'); // NUMERIC, TEXT, IGNORE_CASE
  const direction = block.getFieldValue('DIRECTION') === '1' ? 1 : -1; // 1 for A-Z, -1 for Z-A

  const functionName = generator.provideFunction_(
      'lists_sort_helper',
      `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(
    mut list: Vec<String>,
    type_str: &str,
    direction_val: i32
) -> Vec<String> {
    match type_str {
        "NUMERIC" => {
            list.sort_by(|a, b| {
                let val_a = a.parse::<f64>().unwrap_or(f64::NAN);
                let val_b = b.parse::<f64>().unwrap_or(f64::NAN);
                if direction_val == 1 { val_a.partial_cmp(&val_b).unwrap_or(std::cmp::Ordering::Equal) }
                else { val_b.partial_cmp(&val_a).unwrap_or(std::cmp::Ordering::Equal) }
            });
        }
        "TEXT" => {
            if direction_val == 1 { list.sort_unstable(); }
            else { list.sort_unstable_by(|a, b| b.cmp(a)); }
        }
        "IGNORE_CASE" => {
            list.sort_by(|a, b| {
                if direction_val == 1 { a.to_lowercase().cmp(&b.to_lowercase()) }
                else { b.to_lowercase().cmp(&a.to_lowercase()) }
            });
        }
        _ => {} // Should not happen
    }
    list
}`);

  const code = `${functionName}(${list}.clone(), "${type}", ${direction})`; // Clone list to sort
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function lists_split(block: Block, generator: RustGenerator): [string, number] {
  const mode = block.getFieldValue('MODE'); // SPLIT or JOIN
  const input = generator.valueToCode(block, 'INPUT', generator.ORDER_NONE) || 'String::new()';
  const delimiter = generator.valueToCode(block, 'DELIM', generator.ORDER_NONE) || 'String::from("")';

  if (mode === 'SPLIT') {
    const functionName = generator.provideFunction_(
        'lists_split_helper',
        `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(text: &str, delimiter: &str) -> Vec<String> {
    if delimiter.is_empty() { // Split by each character
        text.chars().map(|c| c.to_string()).collect()
    } else {
        text.split(delimiter).map(|s| s.to_string()).collect()
    }
}`);
    const code = `${functionName}(&(${input}).to_string(), &(${delimiter}).to_string())`;
    return [code, generator.ORDER_FUNCTION_CALL];
  } else if (mode === 'JOIN') {
    // Input is expected to be a list (Vec<String>)
    const functionName = generator.provideFunction_(
        'lists_join_helper',
        `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<String>, delimiter: &str) -> String {
    list.join(delimiter)
}`);
    // Assuming 'input' evaluates to Vec<String>
    const code = `${functionName}(&${input}, &(${delimiter}).to_string())`;
    return [code, generator.ORDER_FUNCTION_CALL];
  } else {
    throw 'Unknown mode: ' + mode;
  }
}

export function lists_reverse(block: Block, generator: RustGenerator): [string, number] {
  const list = generator.valueToCode(block, 'LIST',
      generator.ORDER_NONE) || 'Vec::<String>::new()';
  
  const functionName = generator.provideFunction_(
      'lists_reverse_helper',
      `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(mut list: Vec<String>) -> Vec<String> {
    list.reverse();
    list
}`);
  // Clone the list before reversing, as reverse is in-place.
  const code = `${functionName}(${list}.clone())`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

// Math on list is often grouped with list operations.
export function math_on_list(block: Block, generator: RustGenerator): [string, number] {
  const operator = block.getFieldValue('OP'); // SUM, MIN, MAX, AVERAGE, MEDIAN, MODE, STD_DEV, RANDOM
  const list = generator.valueToCode(block, 'LIST', generator.ORDER_NONE) || "Vec::<f64>::new()"; // Assuming list of numbers for math ops

  // Helper functions will be defined for each operation.
  // For now, let's implement SUM, MIN, MAX, AVERAGE. Others are more complex.

  let functionName: string;
  let order = generator.ORDER_FUNCTION_CALL;

  switch (operator) {
    case 'SUM':
      functionName = generator.provideFunction_(
          'math_sum',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    list.iter().sum()
}`);
      break;
    case 'MIN':
      functionName = generator.provideFunction_(
          'math_min',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.is_empty() { return 0.0; } // Or f64::NAN
    list.iter().fold(f64::INFINITY, |a, &b| a.min(b))
}`);
      break;
    case 'MAX':
      functionName = generator.provideFunction_(
          'math_max',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.is_empty() { return 0.0; } // Or f64::NAN
    list.iter().fold(f64::NEG_INFINITY, |a, &b| a.max(b))
}`);
      break;
    case 'AVERAGE':
      functionName = generator.provideFunction_(
          'math_average',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.is_empty() { return 0.0; } // Or f64::NAN
    list.iter().sum::<f64>() / (list.len() as f64)
}`);
      break;
    case 'MEDIAN':
      functionName = generator.provideFunction_(
          'math_median',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.is_empty() { return 0.0; } // Or f64::NAN
    let mut sorted_list = list.clone();
    sorted_list.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let mid = sorted_list.len() / 2;
    if sorted_list.len() % 2 == 0 {
        (sorted_list[mid - 1] + sorted_list[mid]) / 2.0
    } else {
        sorted_list[mid]
    }
}`);
      break;
    case 'MODE': // Mode is more complex, returns Vec<f64>
      functionName = generator.provideFunction_(
          'math_modes', // Note: plural, as there can be multiple modes
          `
use std::collections::HashMap;
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> Vec<f64> {
    if list.is_empty() { return Vec::new(); }
    let mut counts = HashMap::new();
    for &value in list {
        // Using u64 representation for f64 keys in HashMap due to f64 not implementing Eq/Hash directly.
        // This is a simplification and might have precision issues for some f64 values.
        // A more robust solution would involve custom structs or a different approach.
        *counts.entry(value.to_bits()).or_insert(0) += 1;
    }
    let max_count = counts.values().max().cloned().unwrap_or(0);
    if max_count == 0 { return Vec::new(); } // Should not happen if list not empty
    counts.into_iter()
        .filter(|&(_, count)| count == max_count)
        .map(|(val_bits, _)| f64::from_bits(val_bits))
        .collect()
}`);
      // Mode returns a list, so the block output type should reflect this.
      // For now, we'll assume the first mode is taken if used in a numeric context,
      // or the user handles the Vec<f64> output.
      // This might need adjustment based on how Blockly handles list outputs for this block.
      // Let's return the Vec<f64> directly.
      break;
    case 'STD_DEV':
      functionName = generator.provideFunction_(
          'math_std_dev',
          `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.len() < 2 { return 0.0; } // Std dev of 0 or 1 elements is typically 0 or undefined.
    let mean = list.iter().sum::<f64>() / (list.len() as f64);
    let variance = list.iter().map(|value| {
        let diff = mean - value;
        diff * diff
    }).sum::<f64>() / (list.len() as f64); // Population standard deviation
    variance.sqrt()
}`);
      break;
    case 'RANDOM':
      functionName = generator.provideFunction_(
          'math_random_item',
          `
use rand::Rng;
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(list: &Vec<f64>) -> f64 {
    if list.is_empty() { return 0.0; } // Or f64::NAN
    let mut rng = rand::thread_rng();
    let index = rng.gen_range(0..list.len());
    list[index]
}`);
      break;
    default:
      throw 'Unknown operator: ' + operator;
  }

  // The 'list' input to math_on_list is expected to be a list of numbers.
  // The current list blocks create Vec<String>.
  // We need to convert Vec<String> to Vec<f64> for math_on_list.
  // This conversion should happen before calling the helper.
  // A new helper can do this.

  const conversionHelper = generator.provideFunction_(
    'convert_to_float_vec',
    `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(string_vec: &Vec<String>) -> Vec<f64> {
    string_vec.iter()
        .map(|s| s.parse::<f64>().unwrap_or(0.0)) // Default to 0.0 if parse fails
        .collect()
}`);

  // If the operator is MODE, it returns a Vec<f64>, not a single f64.
  // The block's output connection should be checked or this needs special handling.
  // For now, the generated code will call the function that returns Vec<f64>.
  if (operator === 'MODE') {
    const code = `${functionName}(&${conversionHelper}(&${list}))`;
    return [code, order]; // Returns Vec<f64>
  } else {
    const code = `${functionName}(&${conversionHelper}(&${list}))`;
    return [code, order]; // Returns f64
  }
}
