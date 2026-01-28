#!/usr/bin/env node
/**
 * Tauri Build Script
 *
 * This script prepares the Next.js app for Tauri static export by:
 * 1. Temporarily moving the api folder
 * 2. Creating stub action files that work in desktop mode
 * 3. Building the static export
 * 4. Restoring the api folder
 *
 * Usage: node scripts/build-tauri.mjs
 */

import { existsSync, mkdirSync, rmSync, cpSync, writeFileSync, readdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const API_DIR = join(ROOT, 'app', 'api');
const API_BACKUP = join(ROOT, '_tauri_api_backup');
const ACTIONS_DIR = join(ROOT, 'actions');
const ACTIONS_BACKUP = join(ROOT, '_tauri_actions_backup');

console.log('🚀 Starting Tauri build preparation...');

/**
 * Generate stub content for a server action file
 * Exports empty functions that throw errors when called in desktop mode
 */
function generateActionStub(filename) {
  const actionName = basename(filename, '.ts');

  // Map known action files to their exported functions
  const actionExports = {
    'brain-actions': [
      'getBrainGraphData',
      'getKnowledgeStorageStats',
      // Type exports
      'GraphNode',
      'GraphEdge',
      'KnowledgeGraphData',
      'StorageStats'
    ],
    'agent-actions': [
      'getAgents',
      'createAgent',
      'updateAgent',
      'deleteAgent',
      'getAgentById'
    ],
    'inbox-actions': [
      'getThreads',
      'getMessages',
      'sendMessage',
      'createThread',
      'archiveThread'
    ],
    'pipeline-actions': [
      'getPipelines',
      'createPipeline',
      'updatePipeline',
      'deletePipeline',
      'executePipeline'
    ],
    'settings-actions': [
      'getSettings',
      'updateSettings'
    ],
    'budget-actions': [
      'getBudgetStats',
      'updateBudget'
    ],
    'budget-analytics': [
      'getBudgetAnalytics'
    ],
    'log-actions': [
      'getLogs',
      'clearLogs'
    ],
    'ai-optimization': [
      'optimizePrompt',
      'getOptimizationStats'
    ]
  };

  const exports = actionExports[actionName] || [];

  // Generate stub functions
  const stubFunctions = exports.map(exp => {
    // Check if it's a type (starts with capital letter and is a known type pattern)
    if (/^[A-Z]/.test(exp) && (exp.includes('Node') || exp.includes('Edge') || exp.includes('Data') || exp.includes('Stats'))) {
      return `// Type stub for Tauri build
export interface ${exp} {
  [key: string]: unknown;
}`;
    }

    return `export async function ${exp}(...args: unknown[]): Promise<{ success: false; error: string }> {
  console.warn('[Tauri Desktop] Server action "${exp}" called - use API instead');
  return { success: false, error: 'Server actions not available in desktop mode. Use the cloud API.' };
}`;
  }).join('\n\n');

  return `/**
 * Tauri Desktop Stub - ${actionName}
 *
 * This file is auto-generated for Tauri static builds.
 * Server actions are not available in desktop mode.
 * Use the cloud API endpoints instead.
 *
 * @generated
 */

'use client';

${stubFunctions}
`;
}

// Step 1: Backup directories that contain server-side code
function backupServerCode() {
  console.log('📦 Backing up server-side code...');

  // Backup API routes
  if (existsSync(API_DIR)) {
    if (existsSync(API_BACKUP)) rmSync(API_BACKUP, { recursive: true });
    cpSync(API_DIR, API_BACKUP, { recursive: true });
    rmSync(API_DIR, { recursive: true });
    console.log('  ✓ Backed up app/api');
  }

  // Backup server actions
  if (existsSync(ACTIONS_DIR)) {
    if (existsSync(ACTIONS_BACKUP)) rmSync(ACTIONS_BACKUP, { recursive: true });
    cpSync(ACTIONS_DIR, ACTIONS_BACKUP, { recursive: true });
    console.log('  ✓ Backed up actions');
  }
}

// Dynamic route DIRECTORIES to temporarily disable for static export
// We rename the entire [param] directories to _tauri_disabled_[param]
const DYNAMIC_ROUTE_DIRS = [
  'app/(app)/(dashboard)/agents/[id]',
  'app/(app)/(dashboard)/agents/marketplace/[id]',
  'app/(app)/(dashboard)/knowledge/[id]',
  'app/(app)/(dashboard)/pipelines/[id]',
  'app/(app)/inbox/[threadId]',
];

// Pages/directories that use server-only features (cookies, headers, etc.)
// These need to be disabled for static export
const SERVER_ONLY_DIRS = [
  'app/(app)/(dashboard)/admin',
  'app/(app)/settings',
  'app/(fullscreen)/studio',
];

// Pages that need client-only stubs (can't be deleted, but need modification)
const PAGES_NEEDING_STUBS = [
  'app/page.tsx',
];

// Track renamed directories
const renamedDirs = new Map();

// Step 2: Create stub files and disable dynamic routes
function createStubs() {
  console.log('📝 Creating stub files...');

  // Create empty api directory with a placeholder
  mkdirSync(API_DIR, { recursive: true });

  // Create stub action files
  if (existsSync(ACTIONS_BACKUP)) {
    const actionFiles = readdirSync(ACTIONS_BACKUP).filter(f => f.endsWith('.ts'));

    // Remove original actions and create stubs
    if (existsSync(ACTIONS_DIR)) {
      rmSync(ACTIONS_DIR, { recursive: true });
    }
    mkdirSync(ACTIONS_DIR, { recursive: true });

    for (const file of actionFiles) {
      const stubContent = generateActionStub(file);
      writeFileSync(join(ACTIONS_DIR, file), stubContent);
      console.log(`  ✓ Created stub: actions/${file}`);
    }
  }

  // Disable dynamic route directories by renaming them
  // This completely removes them from the Next.js build
  console.log('📝 Disabling dynamic routes for static export...');
  for (const dirPath of DYNAMIC_ROUTE_DIRS) {
    const fullPath = join(ROOT, dirPath);
    if (existsSync(fullPath)) {
      // Extract the param name (e.g., [id] -> id)
      const dirName = basename(fullPath);
      const parentDir = dirname(fullPath);
      const disabledName = `_tauri_disabled_${dirName}`;
      const disabledPath = join(parentDir, disabledName);

      // Rename to disable
      if (existsSync(disabledPath)) rmSync(disabledPath, { recursive: true });
      cpSync(fullPath, disabledPath, { recursive: true });
      rmSync(fullPath, { recursive: true });
      renamedDirs.set(fullPath, disabledPath);
      console.log(`  ✓ Disabled: ${dirPath}`);
    }
  }

  // Disable server-only directories (admin, settings, studio, etc.)
  console.log('📝 Disabling server-only directories for static export...');
  for (const dirPath of SERVER_ONLY_DIRS) {
    const fullPath = join(ROOT, dirPath);
    if (existsSync(fullPath)) {
      const parentDir = dirname(fullPath);
      const itemName = basename(fullPath);
      const disabledName = `_tauri_disabled_${itemName}`;
      const disabledPath = join(parentDir, disabledName);

      // Rename to disable
      if (existsSync(disabledPath)) rmSync(disabledPath, { recursive: true });
      cpSync(fullPath, disabledPath, { recursive: true });
      rmSync(fullPath, { recursive: true });
      renamedDirs.set(fullPath, disabledPath);
      console.log(`  ✓ Disabled: ${dirPath}`);
    }
  }

  // Create client-only stubs for pages that must exist (like root page)
  console.log('📝 Creating client-only stubs for essential pages...');
  for (const pagePath of PAGES_NEEDING_STUBS) {
    const fullPath = join(ROOT, pagePath);
    if (existsSync(fullPath)) {
      const backupPath = fullPath + '.tauri-backup';
      cpSync(fullPath, backupPath);
      renamedDirs.set(fullPath, backupPath);

      // Write client-only stub
      const stubContent = `'use client'

// Tauri Static Export Stub - @generated
// This page redirects to dashboard in Tauri desktop mode

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TauriHomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard in Tauri desktop mode
    router.replace('/dashboard')
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Flowent Desktop</h1>
        <p>Loading...</p>
      </div>
    </div>
  )
}
`;
      writeFileSync(fullPath, stubContent);
      console.log(`  ✓ Stubbed: ${pagePath}`);
    }
  }
}

// Step 3: Run the Next.js build
function runBuild() {
  console.log('🔨 Running Next.js static export...');

  // Clear Next.js cache first to avoid stale data
  const nextCacheDir = join(ROOT, '.next');
  if (existsSync(nextCacheDir)) {
    console.log('  ⚡ Clearing Next.js cache...');
    rmSync(nextCacheDir, { recursive: true });
  }

  // Debug: verify dynamic routes are disabled
  console.log('  🔍 Verifying dynamic routes are disabled...');
  for (const dirPath of DYNAMIC_ROUTE_DIRS) {
    const fullPath = join(ROOT, dirPath);
    const exists = existsSync(fullPath);
    console.log(`    ${dirPath}: exists=${exists}`);
  }

  try {
    execSync('npx cross-env TAURI_BUILD=true next build', {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        TAURI_BUILD: 'true',
      },
    });
    console.log('  ✓ Build completed successfully');
    return true;
  } catch (error) {
    console.error('  ✗ Build failed:', error.message);
    return false;
  }
}

// Step 4: Restore the backed up directories
function restoreServerCode() {
  console.log('📥 Restoring server-side code...');

  // Remove stub directories
  if (existsSync(API_DIR)) rmSync(API_DIR, { recursive: true });
  if (existsSync(ACTIONS_DIR)) rmSync(ACTIONS_DIR, { recursive: true });

  // Restore backups
  if (existsSync(API_BACKUP)) {
    cpSync(API_BACKUP, API_DIR, { recursive: true });
    rmSync(API_BACKUP, { recursive: true });
    console.log('  ✓ Restored app/api');
  }

  if (existsSync(ACTIONS_BACKUP)) {
    cpSync(ACTIONS_BACKUP, ACTIONS_DIR, { recursive: true });
    rmSync(ACTIONS_BACKUP, { recursive: true });
    console.log('  ✓ Restored actions');
  }

  // Restore dynamic route directories
  console.log('📥 Restoring dynamic route directories...');
  for (const [originalPath, disabledPath] of renamedDirs) {
    if (existsSync(disabledPath)) {
      // Remove any stub directory that might exist at original path
      if (existsSync(originalPath)) rmSync(originalPath, { recursive: true });
      // Restore the original
      cpSync(disabledPath, originalPath, { recursive: true });
      rmSync(disabledPath, { recursive: true });
      console.log(`  ✓ Restored: ${originalPath.replace(ROOT + '/', '')}`);
    }
  }
}

// Main execution
async function main() {
  let buildSuccess = false;

  try {
    backupServerCode();
    createStubs();
    buildSuccess = runBuild();
  } finally {
    // Always restore, even if build fails
    restoreServerCode();
  }

  if (buildSuccess) {
    console.log('');
    console.log('✅ Tauri build preparation complete!');
    console.log('   Static files are in: ./out');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run tauri:build');
    console.log('  2. Find your app in: src-tauri/target/release/bundle/');
  } else {
    console.log('');
    console.log('❌ Build failed. Check the errors above.');
    process.exit(1);
  }
}

main();
