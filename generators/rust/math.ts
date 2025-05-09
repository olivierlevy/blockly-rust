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

export function math_single(block: Block, generator: RustGenerator): [string, number] {
  const operator = block.getFieldValue('OP');
  let code;
  let arg;
  if (operator === 'NEG') {
    // Negation is a special case given its different operator precedence.
    arg = generator.valueToCode(block, 'NUM',
        generator.ORDER_UNARY_NEGATION) || '0';
    if (arg[0] === '-') {
      // Handle double negation.
      arg = ' ' + arg;
    }
    code = '-' + arg;
    return [code, generator.ORDER_UNARY_NEGATION];
  }
  // For most other operations, argument is numeric.
  arg = generator.valueToCode(block, 'NUM',
      generator.ORDER_FUNCTION_CALL) || '0';
  // Rust methods for f64
  switch (operator) {
    case 'ABS':
      code = `${arg}.abs()`;
      break;
    case 'ROOT':
      code = `${arg}.sqrt()`;
      break;
    case 'LN':
      code = `${arg}.ln()`;
      break;
    case 'LOG10':
      code = `${arg}.log10()`;
      break;
    case 'EXP':
      code = `${arg}.exp()`;
      break;
    case 'POW10': // Rust doesn't have a direct 10.pow(arg) or 10_f64.powf(arg).
                  // It's (10.0 as f64).powf(arg as f64) or specific const.
      code = `(10.0_f64).powf(${arg})`; // Assuming arg is f64 or compatible
      break;
    // Trigonometry
    case 'SIN':
      code = `${arg}.sin()`;
      break;
    case 'COS':
      code = `${arg}.cos()`;
      break;
    case 'TAN':
      code = `${arg}.tan()`;
      break;
    case 'ASIN':
      code = `${arg}.asin()`;
      break;
    case 'ACOS':
      code = `${arg}.acos()`;
      break;
    case 'ATAN':
      code = `${arg}.atan()`;
      break;
    // Rounding
    case 'ROUND':
      code = `${arg}.round()`;
      break;
    case 'ROUNDUP':
      code = `${arg}.ceil()`;
      break;
    case 'ROUNDDOWN':
      code = `${arg}.floor()`;
      break;
    default:
      throw Error('Unknown math operator: ' + operator);
  }
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function math_constant(block: Block, generator: RustGenerator): [string, number] {
  const CONSTANTS: {[key: string]: string} = {
    'PI': 'std::f64::consts::PI',
    'E': 'std::f64::consts::E',
    'GOLDEN_RATIO': 'std::f64::consts::PHI', // (1.0 + 5.0_f64.sqrt()) / 2.0
    'SQRT2': 'std::f64::consts::SQRT_2',
    'SQRT1_2': 'std::f64::consts::FRAC_1_SQRT_2',
    'INFINITY': 'std::f64::INFINITY',
  };
  const constant = block.getFieldValue('CONSTANT');
  return [CONSTANTS[constant], generator.ORDER_ATOMIC];
}

export function math_number_property(block: Block, generator: RustGenerator): [string, number] {
  const number_to_check = generator.valueToCode(block, 'NUMBER_TO_CHECK',
      generator.ORDER_MODULUS) || '0';
  const property = block.getFieldValue('PROPERTY');
  let code;
  switch (property) {
    case 'EVEN':
      code = number_to_check + ' % 2 == 0';
      break;
    case 'ODD':
      code = number_to_check + ' % 2 != 0';
      break;
    case 'WHOLE': // Assuming number_to_check could be float, check if fractional part is zero
      code = '(' + number_to_check + ' as f64).fract() == 0.0';
      break;
    case 'POSITIVE':
      code = number_to_check + ' > 0';
      break;
    case 'NEGATIVE':
      code = number_to_check + ' < 0';
      break;
    case 'DIVISIBLE_BY':
      const divisor = generator.valueToCode(block, 'DIVISOR',
          generator.ORDER_MODULUS) || '1'; // Avoid division by zero if not provided
      code = number_to_check + ' % ' + divisor + ' == 0';
      break;
    case 'PRIME':
      // Prime checking is complex. For now, call a placeholder helper function.
      // User would need to define is_prime(n: i64) -> bool or similar.
      // TODO: Consider adding a helper function to definitions if commonly needed.
      code = 'is_prime(' + number_to_check + ')'; // Placeholder
      generator.addDefinition('is_prime_placeholder', 
        '// TODO: Implement is_prime(n: i64) -> bool\\nfn is_prime(n: i64) -> bool {\\n  if n <= 1 { return false; }\\n  if n <= 3 { return true; }\\n  if n % 2 == 0 || n % 3 == 0 { return false; }\\n  let mut i = 5;\\n  while i * i <= n {\\n    if n % i == 0 || n % (i + 2) == 0 { return false; }\\n    i += 6;\\n  }\\n  true\\n}');
      break;
    default:
      throw Error('Unknown math property: ' + property);
  }
  return [code, generator.ORDER_EQUALITY];
}

export function math_modulo(block: Block, generator: RustGenerator): [string, number] {
  // Remainder operator.
  const argument0 = generator.valueToCode(block, 'DIVIDEND',
      generator.ORDER_MODULUS) || '0';
  const argument1 = generator.valueToCode(block, 'DIVISOR',
      generator.ORDER_MODULUS) || '1'; // Avoid division by zero if not provided
  const code = argument0 + ' % ' + argument1;
  return [code, generator.ORDER_MODULUS];
}

export function math_constrain(block: Block, generator: RustGenerator): [string, number] {
  // Constrain a number between two limits.
  const argument0 = generator.valueToCode(block, 'VALUE',
      generator.ORDER_NONE) || '0';
  const argument1 = generator.valueToCode(block, 'LOW',
      generator.ORDER_NONE) || '0';
  const argument2 = generator.valueToCode(block, 'HIGH',
      generator.ORDER_NONE) || '0';
  // Assuming the types are compatible for .clamp() or can be cast.
  // e.g., (value as f64).clamp(low as f64, high as f64)
  // For simplicity, direct use:
  const code = `${argument0}.clamp(${argument1}, ${argument2})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function math_random_int(block: Block, generator: RustGenerator): [string, number] {
  const from = generator.valueToCode(block, 'FROM', generator.ORDER_NONE) || '0';
  const to = generator.valueToCode(block, 'TO', generator.ORDER_NONE) || '0';
  const functionName = generator.provideFunction('rand_int_in_range', [
    'fn ' + generator.FUNCTION_NAME_PLACEHOLDER_ + '(min: i64, max: i64) -> i64 {',
    '  // Basic random int, assumes \'rand\' crate is used or similar implemented.',
    '  // For a version without external crates, a simple LCG could be used,',
    '  // but quality would be low. This is a placeholder.',
    '  // use rand::Rng;',
    '  // if min > max { let temp = min; min = max; max = temp; }',
    '  // return rand::thread_rng().gen_range(min..=max);',
    '  unimplemented!("rand_int_in_range(min, max) - requires \'rand\' crate or custom implementation");',
    '}'
  ]);
  const code = `${functionName}(${from}, ${to})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function math_random_float(block: Block, generator: RustGenerator): [string, number] {
  const functionName = generator.provideFunction('rand_float', [
    'fn ' + generator.FUNCTION_NAME_PLACEHOLDER_ + '() -> f64 {',
    '  // Basic random float (0.0 to 1.0), assumes \'rand\' crate or similar.',
    '  // use rand::Rng;',
    '  // return rand::thread_rng().gen::<f64>();',
    '  unimplemented!("rand_float() - requires \'rand\' crate or custom implementation");',
    '}'
  ]);
  return [functionName + '()', generator.ORDER_FUNCTION_CALL];
}

export function math_atan2(block: Block, generator: RustGenerator): [string, number] {
  const argument0 = generator.valueToCode(block, 'Y', // Note: Blockly uses Y as first arg
      generator.ORDER_NONE) || '0';
  const argument1 = generator.valueToCode(block, 'X',
      generator.ORDER_NONE) || '0';
  // Assuming f64 for .atan2()
  const code = `${argument0}.atan2(${argument1})`;
  return [code, generator.ORDER_FUNCTION_CALL];
}
