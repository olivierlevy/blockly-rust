/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for procedure blocks.
 */

// Former goog.module ID: Blockly.Rust.procedures

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';
import {NameType} from '../../core/names.js';

export function procedures_defnoreturn(block: Block, generator: RustGenerator): string {
  // Define a procedure with no return value.
  const funcName = generator.nameDB_!.getName(
      block.getFieldValue('NAME'), NameType.PROCEDURE);
  let branch = generator.statementToCode(block, 'STACK');
  if (generator.STATEMENT_PREFIX) {
    branch = generator.prefixLines(
        generator.STATEMENT_PREFIX.replace(/%1/g, '\'' + block.id + '\''),
        generator.INDENT) + branch;
  }
  if (generator.INFINITE_LOOP_TRAP) {
    branch = generator.INFINITE_LOOP_TRAP.replace(/%1/g, '\'' + block.id + '\'') +
        branch;
  }
  let returnValue = generator.valueToCode(block, 'RETURN',
      generator.ORDER_NONE) || '';
  if (returnValue) {
    returnValue = generator.INDENT + 'return ' + returnValue + ';\\n';
  }

  // Get arguments.
  const args = [];
  const variables = block.getVars();
  for (let i = 0; i < variables.length; i++) {
    args[i] = generator.nameDB_!.getName(variables[i], NameType.VARIABLE) + ': &str'; // Assuming string type for now
  }
  // TODO: Add proper type handling for arguments. For now, defaulting to &str.

  let code = 'fn ' + funcName + '(' + args.join(', ') + ') {\\n' +
      branch + returnValue + '}';
  code = generator.scrub(block, code); // Use public scrub method
  // Add % OMEGAMONU functions - they are not needed in Rust.
  generator.addDefinition('%' + funcName, code); // Use public addDefinition method
  return ''; // Procedures are defined elsewhere, not inline
}

// procedures_defreturn, procedures_callnoreturn, procedures_callreturn, procedures_ifreturn
// will be added next.
