#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * 1. Replaces environment variables in js/config.js
 * 2. Minifies all JS files with esbuild
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// --- Step 1: Environment variable injection ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const configPath = path.join(rootDir, 'js', 'config.js');
let config = fs.readFileSync(configPath, 'utf8');

if (SUPABASE_URL) {
  config = config.replace(/SUPABASE_URL: '[^']*'/, `SUPABASE_URL: '${SUPABASE_URL}'`);
  console.log('✓ Replaced SUPABASE_URL');
}
if (SUPABASE_ANON_KEY) {
  config = config.replace(/SUPABASE_ANON_KEY: '[^']*'/, `SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}'`);
  console.log('✓ Replaced SUPABASE_ANON_KEY');
}
if (GEMINI_API_KEY) {
  config = config.replace(/GEMINI_API_KEY: '[^']*'/, `GEMINI_API_KEY: '${GEMINI_API_KEY}'`);
  console.log('✓ Replaced GEMINI_API_KEY');
}
fs.writeFileSync(configPath, config, 'utf8');

// --- Step 2: Minify JS files ---
try {
  const esbuild = require('esbuild');
  const jsDir = path.join(rootDir, 'js');
  const viewsDir = path.join(jsDir, 'views');

  const jsFiles = [
    ...fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).map(f => path.join(jsDir, f)),
    ...fs.readdirSync(viewsDir).filter(f => f.endsWith('.js')).map(f => path.join(viewsDir, f))
  ];

  // Also minify sw.js at root
  const swPath = path.join(rootDir, 'sw.js');
  if (fs.existsSync(swPath)) jsFiles.push(swPath);

  let totalSaved = 0;
  for (const file of jsFiles) {
    const original = fs.readFileSync(file, 'utf8');
    const result = esbuild.transformSync(original, {
      minify: true,
      target: 'es2020',
    });
    fs.writeFileSync(file, result.code, 'utf8');
    const saved = original.length - result.code.length;
    totalSaved += saved;
  }

  console.log(`✓ Minified ${jsFiles.length} JS files (saved ${(totalSaved / 1024).toFixed(1)}KB)`);
} catch (err) {
  console.warn('⚠ Minification skipped:', err.message);
}

console.log('✓ Build complete');
