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
    // Add block generators to the lookup table.
    this.forBlock['math_number'] = this.math_number;
    this.forBlock['text'] = this.text;
    this.forBlock['text_print'] = this.text_print;
    this.forBlock['variables_get'] = this.variables_get;
    this.forBlock['variables_set'] = this.variables_set;
    this.forBlock['controls_if'] = this.controls_if;
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
                                            // Let's assume the input provides a typed value for now. Or use a default like `Default::default()`.
                                            // For simplicity, let's use `""` as a placeholder if needed, though it won't compile if assigned to a number.
                                            // A better default might depend on expected type, maybe `Default::default()`?
                                            // Let's use `""` for now and refine later.
    const varName = generator.nameDB_!.getName(block.getFieldValue('VAR'), NameType.VARIABLE);
    // TODO: Handle variable types and declaration vs assignment properly.
    // Assuming first assignment uses `let mut`. Reassignment just uses `varName = ...;`
    // This basic version always uses `let mut`, which isn't correct for reassignment.
    return 'let mut ' + varName + ' = ' + argument0 + ';\\n';
  }

  controls_if(block: any, generator: this): string {
    // If/elseif/else condition.
    let n = 0;
    let code = '';
    let branchCode;
    let conditionCode;
    
    do {
      conditionCode = generator.valueToCode(block, 'IF' + n,
          generator.ORDER_NONE) || 'false'; // Default to false if condition is empty
      branchCode = generator.statementToCode(block, 'DO' + n);
      code += (n > 0 ? ' else ' : '') +
          'if ' + conditionCode + ' {\\n' +
          branchCode + '}';
      n++;
    } while (block.getInput('IF' + n));

    if (block.getInput('ELSE')) {
      branchCode = generator.statementToCode(block, 'ELSE');
      code += ' else {\\n' + branchCode + '}';
    }
    return code + '\\n';
  }

  /**
   * Initialise the database of variable names.
   * @param workspace Workspace to generate code from.
   */
  init(workspace: Workspace) {
    super.init(workspace); // Calls CodeGenerator's init

    // Always initialize nameDB_ for RustGenerator with its specific reserved words.
    // Cast to `any` to bypass incorrect .d.ts typing for the Names constructor.
    this.nameDB_ = new Names(this.rustReservedWords_ as any);
    
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

    // Convert the definitions dictionary into a list.
    // const definitions = Object.values(this.definitions_);
    // // Call Blockly.CodeGenerator.getDefinitions_ function to get all definitions
    // // without triggering warning without typing the call.
    // const allDefs = CodeGenerator.prototype.getDefinitions_.call(this);
    // if (allDefs.length) {
    //   code = allDefs.join('\\n\\n') + '\\n\\n\\n' + code;
    // }
    // code = super.finish(code); // This calls getDefinitions_
    
    // For now, just return the code.
    // We might need to add variable declarations or other setup code.
    let allDefs = '';
    if (this.definitions_ && Object.keys(this.definitions_).length > 0) {
        allDefs = Object.values(this.definitions_).join('\\n\\n') + '\\n\\n\\n';
    }
    
    // Clean up temporary data.
    this.definitions_ = Object.create(null);
    this.functionNames_ = Object.create(null);
    this.nameDB_!.reset(); // Ensure nameDB_ is not null before calling reset
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
    // or expressions used as statements might need specific handling.
    // For example, `expr;` or `let _ = expr;`
    return line + ';\\n';
  }

  /**
   * Encode a string as a properly escaped Rust string, complete with
   * quotes.
   * @param string Text to encode.
   * @return Rust string.
   */
  quote_(string: string): string {
    // TODO: Implement proper Rust string escaping.
    // Rust uses "..." for strings and '...' for characters.
    // Escaping rules: \n, \r, \t, \\, \", \0
    // Unicode escapes: \xHH (byte), \u{HHHH} (Unicode scalar value)
    string = string.replace(/\\/g, '\\\\')
               .replace(/\n/g, '\\n')
               .replace(/\r/g, '\\r')
               .replace(/"/g, '\\"')
               .replace(/'/g, "\\'"); // May not be needed if we always use "
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
    // TODO: Implement Rust-specific blockToCode logic if needed,
    // or rely on the superclass implementation.
    return super.blockToCode(block, opt_thisOnly);
  }

  /**
   * Generate code for the specified block (and attached blocks).
   * @param block The block to generate code for.
   * @return The generated code.
   */
  // blockToCode(block: Block): string | [string, number] {
  //   // Fallback for any unimplemented blocks.
  //   // console.log('Unimplemented block: ' + block.type);
  //   // return '';
  //   return super.blockToCode(block);
  // }
}

export const rustGenerator = new RustGenerator();

// Make it available on the global Blockly object for non-module contexts
// like demos/code/code.js
if (typeof (globalThis as any).Blockly === 'object') {
  ((globalThis as any).Blockly as any).Rust = rustGenerator;
}
