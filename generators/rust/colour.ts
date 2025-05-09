/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generating Rust for colour blocks.
 */

import type {Block} from '../../core/block.js';
import type {RustGenerator} from '../rust.js';

export function colour_picker(block: Block, generator: RustGenerator): [string, number] {
  // Colour picker.
  const code = generator.quote_(block.getFieldValue('COLOUR'));
  return [code, generator.ORDER_ATOMIC];
}

export function colour_random(block: Block, generator: RustGenerator): [string, number] {
  // Generate a random colour.
  const functionName = generator.provideFunction_(
      'colour_random_helper',
      `
use rand::Rng;
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}() -> String {
    let mut rng = rand::thread_rng();
    let r: u8 = rng.gen();
    let g: u8 = rng.gen();
    let b: u8 = rng.gen();
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}`);
  const code = `${functionName}()`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function colour_rgb(block: Block, generator: RustGenerator): [string, number] {
  // Compose a colour from RGB components.
  const r = generator.valueToCode(block, 'RED', generator.ORDER_NONE) || '0.0';
  const g = generator.valueToCode(block, 'GREEN', generator.ORDER_NONE) || '0.0';
  const b = generator.valueToCode(block, 'BLUE', generator.ORDER_NONE) || '0.0';

  const functionName = generator.provideFunction_(
      'colour_rgb_helper',
      `
fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(r_float: f64, g_float: f64, b_float: f64) -> String {
    let r = (r_float.max(0.0).min(1.0) * 255.0).round() as u8;
    let g = (g_float.max(0.0).min(1.0) * 255.0).round() as u8;
    let b = (b_float.max(0.0).min(1.0) * 255.0).round() as u8;
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}`);
  // Blockly colour inputs are 0-1, but some implementations might use 0-255.
  // The helper assumes 0-1 from Blockly, then scales to 0-255.
  // If inputs are already 0-255, the scaling logic in the helper would need adjustment.
  // For now, assuming inputs are 0-1 as per typical Blockly colour component expectations.
  const code = `${functionName}((${r}) as f64, (${g}) as f64, (${b}) as f64)`;
  return [code, generator.ORDER_FUNCTION_CALL];
}

export function colour_blend(block: Block, generator: RustGenerator): [string, number] {
  // Blend two colours together.
  const c1 = generator.valueToCode(block, 'COLOUR1', generator.ORDER_NONE) || "'#000000'";
  const c2 = generator.valueToCode(block, 'COLOUR2', generator.ORDER_NONE) || "'#000000'";
  const ratio = generator.valueToCode(block, 'RATIO', generator.ORDER_NONE) || '0.5';

  const functionName = generator.provideFunction_(
      'colour_blend_helper',
      `
// Helper to parse hex string to RGB u8 tuple
fn hex_to_rgb(hex: &str) -> Option<(u8, u8, u8)> {
    if hex.starts_with('#') && hex.len() == 7 {
        let r = u8::from_str_radix(&hex[1..3], 16).ok()?;
        let g = u8::from_str_radix(&hex[3..5], 16).ok()?;
        let b = u8::from_str_radix(&hex[5..7], 16).ok()?;
        Some((r, g, b))
    } else {
        None // Invalid hex format
    }
}

fn ${generator.FUNCTION_NAME_PLACEHOLDER_}(colour1_str: &str, colour2_str: &str, ratio_float: f64) -> String {
    let (r1, g1, b1) = hex_to_rgb(colour1_str).unwrap_or((0, 0, 0));
    let (r2, g2, b2) = hex_to_rgb(colour2_str).unwrap_or((0, 0, 0));

    let ratio = ratio_float.max(0.0).min(1.0);

    let r = ((r1 as f64 * (1.0 - ratio)) + (r2 as f64 * ratio)).round() as u8;
    let g = ((g1 as f64 * (1.0 - ratio)) + (g2 as f64 * ratio)).round() as u8;
    let b = ((b1 as f64 * (1.0 - ratio)) + (b2 as f64 * ratio)).round() as u8;

    format!("#{:02x}{:02x}{:02x}", r, g, b)
}`);
  // Ensure inputs are strings for hex_to_rgb and ratio is f64
  const code = `${functionName}(&(${c1}).to_string(), &(${c2}).to_string(), (${ratio}) as f64)`;
  return [code, generator.ORDER_FUNCTION_CALL];
}
