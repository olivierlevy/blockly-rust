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
import * as CROSProcedures from './rust/procedures.js';
import * as CROSLOops from './rust/loops.js'; // Corrected typo
import * as CROSLists from './rust/lists.js';
import * as CROSColour from './rust/colour.js';
// import * as CROSUnittest from './rust/unittest.js'; // Removed as unittest handlers will be in tests/

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
        CROSProcedures,
        CROSLOops, // Corrected typo
        CROSLists,
        CROSColour,
        // CROSUnittest, // Removed
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
        allDefs = Object.values(this.definitions_).join('\n\n') + '\n\n\n';
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
    return line + ';\n';
  }

  /**
   * Encode a string as a properly escaped Rust string, complete with
   * quotes.
   * @param string Text to encode.
   * @return Rust string.
   */
  quote_(string: string): string {
    // Do not escape \n to \\n, as actual newlines are desired in the output.
    // The test runner or comparison tool should handle line ending normalization if necessary.
    string = string.replace(/\\/g, '\\\\')
               // .replace(/\n/g, '\\n') // Removed this line
               .replace(/\r/g, '\\r') // Keep \r removal or normalization if needed
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

  /**
   * Adds a definition to the dictionary.
   * @param key The key for the definition.
   * @param definition The definition code.
   */
  public addDefinition(key: string, definition: string): void {
    this.definitions_[key] = definition;
  }

  /**
   * Public wrapper for the protected scrub_ method.
   * @param block The block being scrubbed.
   * @param code The code to scrub.
   * @param thisOnly True to generate code for only this statement.
   * @returns The scrubbed code.
   */
  public scrub(block: any, code: string, thisOnly?: boolean): string {
    // Call the protected scrub_ method of the superclass or this class if overridden
    // For now, assuming we want the superclass's scrub_ behavior if not overridden
    // or if RustGenerator doesn't have its own specific scrub_ logic yet.
    // If RustGenerator had its own this.scrub_ that calls super.scrub_ it would be:
    // return this.scrub_(block, code, thisOnly);
    // Since scrub_ is on CodeGenerator and we are RustGenerator:
    // We need to call it carefully. The original scrub_ is a method of CodeGenerator.
    // A direct call to a protected super method from a public method of the subclass
    // is fine if the method exists on the subclass or superclass.
    // Let's assume scrub_ is available as a protected method.
    // The `scrub_` method is called by `blockToCode`.
    // The `scrub_` method itself calls `blockToCode` for connected blocks.
    // It's safer to just call the public `blockToCode` if that's what `scrub_` does,
    // or replicate minimal scrubbing if needed.
    // However, `scrub_` is usually for handling orphaned value blocks etc.
    // The `scrub_` method in `CodeGenerator` is:
    // scrub_(block: Block, code: string, opt_thisOnly?: boolean): string
    // It's protected. A public wrapper is the way.
    return this.scrub_(block, code, thisOnly);
  }

  /**
   * Public wrapper for the protected provideFunction_ method.
   * @param desiredName The desired name of the function.
   * @param code Array of lines of code for the function.
   * @returns The generated name for the function.
   */
  public provideFunction(desiredName: string, code: string[]): string {
    return this.provideFunction_(desiredName, code);
  }
}

export const rustGenerator = new RustGenerator();

// Removed assignment to global Blockly.Rust as it causes errors
// with frozen/non-extensible Blockly object.
// Generator should be accessed via the 'rust' global created by scriptExport.
