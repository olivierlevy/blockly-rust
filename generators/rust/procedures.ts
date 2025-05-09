/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for procedure blocks.
 */

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';
import {NameType} from '../../core/names.js';

export function procedures_defnoreturn(block: Block, generator: RustGenerator): string {
  const funcName = generator.nameDB_!.getName(block.getFieldValue('NAME'), NameType.PROCEDURE);
  let branch = generator.statementToCode(block, 'STACK') || '';
  if (branch && generator.STATEMENT_PREFIX) {
    branch = generator.prefixLines(generator.STATEMENT_PREFIX.replace(/%1/g, '\'' + block.id + '\''), generator.INDENT) + branch;
  }
  if (branch && generator.INFINITE_LOOP_TRAP) {
    branch = generator.INFINITE_LOOP_TRAP.replace(/%1/g, '\'' + block.id + '\'') + branch;
  }
  const args = [];
  const variables = block.getVars();
  for (let i = 0; i < variables.length; i++) {
    args[i] = generator.nameDB_!.getName(variables[i], NameType.VARIABLE) + ": String /* TODO: type */";
  }
  let code = 'fn ' + funcName + '(' + args.join(', ') + ') {\\n' + branch + '}';
  code = generator.scrub(block, code);
  generator.addDefinition('%' + funcName, code);
  return ''; 
}

export function procedures_defreturn(block: Block, generator: RustGenerator): string {
  const funcName = generator.nameDB_!.getName(block.getFieldValue('NAME'), NameType.PROCEDURE);
  let branch = generator.statementToCode(block, 'STACK') || '';
  if (branch && generator.STATEMENT_PREFIX) {
    branch = generator.prefixLines(generator.STATEMENT_PREFIX.replace(/%1/g, '\'' + block.id + '\''), generator.INDENT) + branch;
  }
  if (branch && generator.INFINITE_LOOP_TRAP) {
    branch = generator.INFINITE_LOOP_TRAP.replace(/%1/g, '\'' + block.id + '\'') + branch;
  }
  let returnValue = generator.valueToCode(block, 'RETURN', generator.ORDER_NONE) || '';
  const returnType = "String"; // TODO: Placeholder type

  if (returnValue) {
    // If branch is empty, returnValue is the body. Otherwise, it's the last statement.
    returnValue = (branch.trim() === '' ? '' : generator.INDENT) + returnValue + '\\n'; 
  } else {
    // Function with return type must return a value.
    returnValue = (branch.trim() === '' ? '' : generator.INDENT) + 
                  '// TODO: Define return type and default value if function body is empty\\n' +
                  (branch.trim() === '' ? '' : generator.INDENT) + 
                  'Default::default()\\n';
  }
  
  if (branch.trim() !== '' && !branch.endsWith('\\n')) {
      branch += '\\n';
  }
  
  const args = [];
  const variables = block.getVars();
  for (let i = 0; i < variables.length; i++) {
    args[i] = generator.nameDB_!.getName(variables[i], NameType.VARIABLE) + ": String /* TODO: type */";
  }
  
  // In Rust, if the last expression in a function is not followed by a semicolon, it's the return value.
  // Here, we are constructing the function body. If `branch` contains statements ending in semicolons,
  // and `returnValue` is the final expression, it should not have a semicolon.
  // However, for simplicity and explicit returns, many generators add `return ...;`.
  // My current `returnValue` includes `\n`. If it's an expression, it should be `returnValue.trim()`.
  // Let's adjust to make the last expression the return value if possible, or use explicit return.
  // For now, sticking to explicit `return` if the RETURN block is used, or implicit if only branch.
  // This logic is tricky. Let's simplify: always ensure an explicit return or a value-producing expression at the end.
  // The current `returnValue` is already formatted as an expression with a newline.
  // If `branch` is empty, `returnValue` is the body. If `branch` has statements, `returnValue` is appended.

  let code = 'fn ' + funcName + '(' + args.join(', ') + ') -> ' + returnType + ' {\\n' +
      branch + returnValue + '}';
  code = generator.scrub(block, code);
  generator.addDefinition('%' + funcName, code);
  return '';
}

export function procedures_callnoreturn(block: Block, generator: RustGenerator): string {
  const funcName = generator.nameDB_!.getName(block.getFieldValue('NAME'), NameType.PROCEDURE);
  const args = [];
  const variables = block.getVars(); // These are the procedure's formal parameters
  for (let i = 0; i < variables.length; i++) { // This should iterate over arguments supplied to the call block
    args[i] = generator.valueToCode(block, 'ARG' + i, generator.ORDER_NONE) || '/* TODO: default_arg */';
  }
  const code = funcName + '(' + args.join(', ') + ');\\n';
  return code;
}

export function procedures_callreturn(block: Block, generator: RustGenerator): [string, number] {
  const funcName = generator.nameDB_!.getName(block.getFieldValue('NAME'), NameType.PROCEDURE);
  const args = [];
  const variables = block.getVars(); // Procedure's formal parameters
  for (let i = 0; i < variables.length; i++) { // Iterate over arguments supplied to the call block
    args[i] = generator.valueToCode(block, 'ARG' + i, generator.ORDER_NONE) || '/* TODO: default_arg */';
  }
  const code = funcName + '(' + args.join(', ') + ')';
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function procedures_ifreturn(block: Block, generator: RustGenerator): string {
  const condition = generator.valueToCode(block, 'CONDITION', generator.ORDER_NONE) || 'false';
  let code = 'if ' + condition + ' {\\n';
  if (block.getInput('VALUE')) { // Check if the VALUE input exists on this block
    const value = generator.valueToCode(block, 'VALUE', generator.ORDER_NONE) || 'Default::default() /* TODO: type specific default */';
    code += generator.INDENT + 'return ' + value + ';\\n';
  } else {
    code += generator.INDENT + 'return;\\n';
  }
  code += '}\\n';
  return code;
}
