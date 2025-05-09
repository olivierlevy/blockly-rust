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

// Import an object containing all functions from each module.
import * as CROSLogic from './rust/logic.js';
import * as CROSMath from './rust/math.js';
import * as CROSText from './rust/text.js';
import * as CROSVariables from './rust/variables.js';
// Add imports for loops, procedures, lists when they are created.

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
    const reservedWordsStr =
        'as,async,await,break,const,continue,crate,dyn,else,enum,extern,false,' +
        'fn,for,if,impl,in,let,loop,match,mod,move,mut,pub,ref,return,self,Self,' +
        'static,struct,super,trait,true,type,unsafe,use,where,while,' +
        'abstract,become,box,do,final,macro,override,priv,try,typeof,unsized,virtual,yield';
    reservedWordsStr.split(',').forEach(word => this.rustReservedWords_.add(word));

    // Assign imported block generator functions to this.forBlock using Object.assign.
    Object.assign(
        this.forBlock,
        CROSLogic,
        CROSMath,
        CROSText,
        CROSVariables,
        // Add other modules (loops, procedures, lists) here when created
    );
  }

  // Methods like math_number, text, text_print, variables_get, variables_set,
  // controls_if, logic_compare, math_arithmetic are now imported and assigned
  // via Object.assign in the constructor.
  // Core generator methods like init, finish, scrubNakedValue, quote_ remain here.

  /**
   * Initialise the database of variable names.
   * @param workspace Workspace to generate code from.
   */
  init(workspace: Workspace) {
    super.init(workspace); 

    const reservedWordsString = Array.from(this.rustReservedWords_).join(',');
    this.nameDB_ = new Names(reservedWordsString);
    
    this.nameDB_.setVariableMap(workspace.getVariableMap());
    this.nameDB_.populateVariables(workspace);
    this.nameDB_.populateProcedures(workspace);

    this.isInitialized = true;
  }

  /**
   * Prepend the generated code with the variable definitions.
   * @param code Generated code.
   * @return Completed code.
   */
  finish(code: string): string {
    let allDefs = '';
    if (this.definitions_ && Object.keys(this.definitions_).length > 0) {
        allDefs = Object.values(this.definitions_).join('\\n\\n') + '\\n\\n\\n';
    }
    
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
