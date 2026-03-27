#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Replaces environment variables in js/config.js
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Read js/config.js (env vars now live here instead of index.html)
const configPath = path.join(__dirname, '..', 'js', 'config.js');
let config = fs.readFileSync(configPath, 'utf8');

// Replace values using simple line-based matching
// Config format: SUPABASE_URL: 'value',
if (SUPABASE_URL) {
  config = config.replace(
    /SUPABASE_URL: '[^']*'/,
    `SUPABASE_URL: '${SUPABASE_URL}'`
  );
  console.log('✓ Replaced SUPABASE_URL with environment variable');
}

if (SUPABASE_ANON_KEY) {
  config = config.replace(
    /SUPABASE_ANON_KEY: '[^']*'/,
    `SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'`
  );
  console.log('✓ Replaced SUPABASE_ANON_KEY with environment variable');
}

// Write back to js/config.js
fs.writeFileSync(configPath, config, 'utf8');
console.log('✓ Build complete');
