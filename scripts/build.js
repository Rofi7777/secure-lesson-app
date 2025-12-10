#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Replaces environment variables in index.html
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Read index.html
const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace placeholders if environment variables are set
if (SUPABASE_URL) {
  // Replace the SUPABASE_URL value
  html = html.replace(
    /const SUPABASE_URL = .*?;/,
    `const SUPABASE_URL = '${SUPABASE_URL}';`
  );
  console.log('✓ Replaced SUPABASE_URL with environment variable');
}

if (SUPABASE_ANON_KEY) {
  // Replace the SUPABASE_ANON_KEY value
  html = html.replace(
    /const SUPABASE_ANON_KEY = .*?;/,
    `const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';`
  );
  console.log('✓ Replaced SUPABASE_ANON_KEY with environment variable');
}

// Write back to index.html
fs.writeFileSync(indexPath, html, 'utf8');
console.log('✓ Build complete');

