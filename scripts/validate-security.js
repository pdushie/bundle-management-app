#!/usr/bin/env node

/**
 * Security Configuration Validator
 * 
 * This script validates that all required security configurations are properly set
 * for the session security implementation.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function validateEnvironmentVariables() {
  const requiredVars = ['NEXTAUTH_SECRET', 'DATABASE_URL'];
  const missing = [];
  const weak = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value) {
      missing.push(varName);
      continue;
    }

    // Validate NEXTAUTH_SECRET strength
    if (varName === 'NEXTAUTH_SECRET') {
      if (value.length < 32) {
        weak.push(`${varName} should be at least 32 characters long`);
      }
      
      // Check for common weak secrets
      const weakSecrets = ['secret', 'password', '123456', 'development'];
      if (weakSecrets.some(weak => value.toLowerCase().includes(weak))) {
        weak.push(`${varName} appears to use a weak or common value`);
      }
    }

    // Validate DATABASE_URL format
    if (varName === 'DATABASE_URL') {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        weak.push(`${varName} should be a valid PostgreSQL connection string`);
      }
    }
  }

  return { missing, weak };
}

function generateSecureSecret() {
  return crypto.randomBytes(64).toString('hex');
}

function checkFilePermissions() {
  const sensitiveFiles = ['.env.local', '.env', '.env.production'];
  const issues = [];

  for (const file of sensitiveFiles) {
    if (fs.existsSync(file)) {
      try {
        const stats = fs.statSync(file);
        
        // On Windows, file permission checking is different
        if (process.platform === 'win32') {
          // For Windows, we'll just check if the file exists and warn about general security
          console.log(`ℹ️  Windows detected: Please ensure ${file} is not accessible to unauthorized users`);
        } else {
          // Unix-style permission checking
          const mode = stats.mode & parseInt('777', 8);
          
          // Check if file is readable by others (should be 600 or 640 max)
          if (mode & parseInt('044', 8)) {
            issues.push(`${file} has overly permissive permissions (${mode.toString(8)}). Consider chmod 600 ${file}`);
          }
        }
      } catch (error) {
        issues.push(`Could not check permissions for ${file}: ${error.message}`);
      }
    }
  }

  return issues;
}

async function main() {
  console.log('🔒 Session Security Configuration Validator\n');

  // Load environment variables
  try {
    const dotenv = await import('dotenv');
    dotenv.config({ path: '.env.local' });
    dotenv.config({ path: '.env' });
  } catch (error) {
    // dotenv is optional for this validation
    console.log('Note: dotenv not available, using existing environment variables');
  }

  const { missing, weak } = validateEnvironmentVariables();
  const permissionIssues = checkFilePermissions();

  let hasIssues = false;

  // Report missing variables
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    hasIssues = true;
    console.log();
  }

  // Report weak configurations
  if (weak.length > 0) {
    console.log('⚠️  Security concerns:');
    weak.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    hasIssues = true;
    console.log();
  }

  // Report permission issues
  if (permissionIssues.length > 0) {
    console.log('⚠️  File permission issues:');
    permissionIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    hasIssues = true;
    console.log();
  }

  // Provide recommendations
  if (hasIssues) {
    console.log('🛠️  Recommendations:');
    
    if (missing.includes('NEXTAUTH_SECRET') || weak.some(w => w.includes('NEXTAUTH_SECRET'))) {
      console.log('   Generate a secure NEXTAUTH_SECRET:');
      console.log(`   NEXTAUTH_SECRET="${generateSecureSecret()}"`);
      console.log();
    }

    if (missing.includes('DATABASE_URL')) {
      console.log('   Set your DATABASE_URL:');
      console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/database"');
      console.log();
    }

    console.log('   Add these to your .env.local file and restart your application.');
    console.log();
  } else {
    console.log('✅ All security configurations are properly set!');
    console.log();
  }

  // Security checklist
  console.log('🔍 Security Checklist:');
  console.log(`   ${missing.length === 0 && weak.length === 0 ? '✅' : '❌'} Environment variables configured`);
  console.log(`   ${permissionIssues.length === 0 ? '✅' : '⚠️ '} File permissions secure`);
  console.log(`   ${process.env.NODE_ENV === 'production' ? '✅' : '⚠️ '} Production environment`);
  console.log(`   ${process.env.NEXTAUTH_URL?.startsWith('https://') ? '✅' : '⚠️ '} HTTPS configured`);
  
  console.log('\n📚 See SECURITY.md for complete implementation guide.');

  process.exit(hasIssues ? 1 : 0);
}

// Always run main function when this script is executed directly
main().catch(error => {
  console.error('Error running security validator:', error);
  process.exit(1);
});

export { validateEnvironmentVariables, generateSecureSecret, checkFilePermissions };