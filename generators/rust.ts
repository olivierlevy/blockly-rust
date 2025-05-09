/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Helper functions for generating Rust for blocks.
 */

// Former goog.module syntax:
// goog.module('Blockly.Rust');
// goog.module.declareLegacyNamespace();

import {CodeGenerator} from '../core/generator.js';
import {Names, NameType} from '../core/names.js';
import {Workspace} from '../core/workspace.js';


/**
 * Rust code generator.
 */
export class RustGenerator extends CodeGenerator {
  private rustReservedWords_: Set<string>;
  /**
   * Order of operation ENUMs.
   * https://doc.rust-lang.org/reference/expressions.html#expression-precedence
   */
  ORDER_ATOMIC = 0;            // 0 "" ...
  ORDER_MEMBER = 1.1;          // . []
  ORDER_FUNCTION_CALL = 1.2;   // ()
  ORDER_NEW = 1.3;             // new
  ORDER_BITWISE_NOT = 3;       // ~
  ORDER_UNARY_PLUS = 3;        // +
  ORDER_UNARY_NEGATION = 3;    // -
  ORDER_LOGICAL_NOT = 3;       // !
  ORDER_MULTIPLICATION = 4;    // *
  ORDER_DIVISION = 4;          // /
  ORDER_MODULUS = 4;           // %
  ORDER_ADDITION = 5;          // +
  ORDER_SUBTRACTION = 5;       // -
  ORDER_BITWISE_SHIFT = 6;     // << >>
  ORDER_RELATIONAL = 7;        // < <= > >=
  ORDER_EQUALITY = 8;          // == != === !==
  ORDER_BITWISE_AND = 9;       // &
  ORDER_BITWISE_XOR = 10;      // ^
  ORDER_BITWISE_OR = 11;       // |
  ORDER_LOGICAL_AND = 12;      // &&
  ORDER_LOGICAL_OR = 13;       // ||
  ORDER_CONDITIONAL = 14;      // ?:
  ORDER_ASSIGNMENT = 15;       // = += -= *= /= %= <<= >>= &= ^= |=
  ORDER_COMMA = 17;            // ,
  ORDER_NONE = 99;             // (...)

  constructor(name = 'Rust') {
    super(name);
    this.isInitialized = false;
    this.rustReservedWords_ = new Set<string>();

    // Add reserved words
    // From https://doc.rust-lang.org/book/appendix-01-keywords.html
    const reservedWordsStr =
        'as,async,await,break,const,continue,crate,dyn,else,enum,extern,false,' +
        'fn,for,if,impl,in,let,loop,match,mod,move,mut,pub,ref,return,self,Self,' +
        'static,struct,super,trait,true,type,unsafe,use,where,while,' +
        // Keywords reserved for future use
        'abstract,become,box,do,final,macro,override,priv,try,typeof,unsized,virtual,yield';
    reservedWordsStr.split(',').forEach(word => this.rustReservedWords_.add(word));

    // TODO: Define order precedence for Rust operators.
    // May need to adjust based on Rust's specific operator precedence.
    // this.ORDER_OVERRIDES = [
    //   // (Lowest) -> Highest
    //   // Function calls vs Member access.
    // ];

    // Add block generators to the lookup table.
    this.forBlock['math_number'] = this.math_number;
    this.forBlock['text'] = this.text;
    this.forBlock['text_print'] = this.text_print;
    this.forBlock['variables_get'] = this.variables_get;
    this.forBlock['variables_set'] = this.variables_set;
    this.forBlock['controls_if'] = this.controls_if;
    this.forBlock['logic_compare'] = this.logic_compare;
    this.forBlock['math_arithmetic'] = this.math_arithmetic;
  }

  math_number(block: any, generator: this): [string, number] {
    // Numeric value.
    const code = String(block.getFieldValue('NUM'));
    return [code, generator.ORDER_ATOMIC];
  }

  text(block: any, generator: this): [string, number] {
    // Text value.
    const code = generator.quote_(block.getFieldValue('TEXT'));
    return [code, generator.ORDER_ATOMIC];
  }

  text_print(block: any, generator: this): string {
    // Print statement.
    const msg = generator.valueToCode(block, 'TEXT', generator.ORDER_NONE) || '""';
    // Note: Rust's println! macro handles various types.
    // Basic implementation assumes the input evaluates to something displayable.
    return 'println!("{}", ' + msg + ');\\n';
  }

  variables_get(block: any, generator: this): [string, number] {
    // Variable getter.
    const code = generator.nameDB_!.getName(block.getFieldValue('VAR'), NameType.VARIABLE);
    return [code, generator.ORDER_ATOMIC];
  }

  variables_set(block: any, generator: this): string {
    // Variable setter.
    const argument0 = generator.valueToCode(block, 'VALUE',
        generator.ORDER_ASSIGNMENT) || '0'; // Default value if input is empty? Rust needs types. Defaulting to 0 might be wrong.
    const varName = generator.nameDB_!.getName(block.getFieldValue('VAR'), NameType.VARIABLE);
    // TODO: Handle variable types and declaration vs assignment properly.
    return 'let mut ' + varName + ' = ' + argument0 + ';\\n';
  }

  controls_if(block: any, generator: this): string {
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
    // Remove trailing newline if present, as statement blocks usually add their own.
    // However, an if/else if/else structure is a single logical statement.
    // The last `\n` from the final block is appropriate.
    return code;
  }

  logic_compare(block: any, generator: this): [string, number] {
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

  math_arithmetic(block: any, generator: this): [string, number] {
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
    // Power arguments may need to be converted to float if they are not already.
    // Rust's .powf() method is typically on f32 or f64.
    // For simplicity, we'll assume they are compatible or this needs type inference later.
    if (!operator) { // POWER case
      // Assuming inputs are numbers, convert to f64 for powf if necessary, or use as is.
      // A more robust solution would handle types.
      // code = `(${argument0} as f64).powf(${argument1} as f64)`;
      // Simpler for now, assuming inputs are appropriate:
      code = `${argument0}.powf(${argument1})`;
    } else {
      code = argument0 + operator + argument1;
    }
    return [code, order];
  }

  /**
   * Initialise the database of variable names.
   * @param workspace Workspace to generate code from.
   */
  init(workspace: Workspace) {
    super.init(workspace); // Calls CodeGenerator's init

    // Always initialize nameDB_ for RustGenerator with its specific reserved words.
    // The Names constructor expects a comma-separated string.
    const reservedWordsString = Array.from(this.rustReservedWords_).join(',');
    this.nameDB_ = new Names(reservedWordsString);
    
    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.nameDB_.populateProcedures(workspace);

    // TODO: Add any Rust-specific initialisation here.
    // For example, defining standard library functions or imports.

    this.isInitialized = true;
  }

  /**
   * Prepend the generated code with the variable definitions.
   * @param code Generated code.
   * @return Completed code.
   */
  finish(code: string): string {
    // TODO: Add any Rust-specific finalisation here.
    // This might include wrapping the code in a main function if necessary,
    // or adding standard imports.
    
    let allDefs = '';
    if (this.definitions_ && Object.keys(this.definitions_).length > 0) {
        allDefs = Object.values(this.definitions_).join('\\n\\n') + '\\n\\n\\n';
    }
    
    // Clean up temporary data.
    this.definitions_ = Object.create(null);
    this.functionNames_ = Object.create(null);
    this.nameDB_!.reset(); 
    this.isInitialized = false;
    
    return allDefs + code;
  }

  /**
   * Naked values are top-level blocks with outputs that aren't plugged into
   * anything.
   * @param line Line of generated code.
   * @return Legal line of code.
   */
  scrubNakedValue(line: string): string {
    // TODO: Rust might require statements to end with a semicolon,
    return line + ';\\n';
  }

  /**
   * Encode a string as a properly escaped Rust string, complete with
   * quotes.
   * @param string Text to encode.
   * @return Rust string.
   */
  quote_(string: string): string {
    string = string.replace(/\\/g, '\\\\')
               .replace(/\n/g, '\\n')
               .replace(/\r/g, '\\r')
               .replace(/"/g, '\\"')
               .replace(/'/g, "\\'");
    return '"' + string + '"';
  }

  /**
   * Common tasks for generating Rust from blocks.
   * Handles comments for the specified block and any connected value blocks.
   * Calls the appropriate block handler function here.
   * @param block The current block.
   * @param opt_thisOnly True to generate code for only this statement.
   * @return The Rust code created for this block.
   */
  blockToCode(block: any, opt_thisOnly?: boolean): string | [string, number] {
    if (!this.isInitialized) {
      console.warn(
          'Generator init was not called before blockToCode was called.');
    }
    return super.blockToCode(block, opt_thisOnly);
  }
}

export const rustGenerator = new RustGenerator();

// Removed assignment to global Blockly.Rust as it causes errors
// with frozen/non-extensible Blockly object.
// Generator should be accessed via the 'rust' global created by scriptExport.
