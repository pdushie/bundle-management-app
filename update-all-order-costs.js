#!/usr/bin/env node

/**
 * Script to run the TypeScript migration for updating order costs
 * Run this script to update all existing orders with correct tier-based pricing
 */

// Get the TypeScript execution command
const tsExecution = process.platform === 'win32' ? 'npx ts-node' : './node_modules/.bin/ts-node';

// Use spawn to execute the command
const { spawn } = require('child_process');
const child = spawn(tsExecution, ['scripts/update-all-order-costs.ts'], { 
  stdio: 'inherit',
  shell: true
});

child.on('exit', function(code) {
  process.exit(code);
});
