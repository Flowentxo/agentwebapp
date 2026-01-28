/**
 * Create demo workspace for development
 */

import 'dotenv/config';
import { workspaceManager } from '../lib/platform/workspace-manager';

async function createDemoWorkspace() {
  console.log('[DEMO-WORKSPACE] Creating demo workspace...');

  try {
    // Check if default-user has workspaces
    const workspaces = await workspaceManager.listWorkspaces('default-user');

    if (workspaces.length > 0) {
      console.log('[DEMO-WORKSPACE] ✅ Workspaces already exist');
      console.log('[DEMO-WORKSPACE]    Total:', workspaces.length);
      workspaces.forEach(w => {
        console.log(`[DEMO-WORKSPACE]    - ${w.name} (${w.id}) ${w.isDefault ? '[DEFAULT]' : ''}`);
      });
      return;
    }

    // Create default workspace
    const workspace = await workspaceManager.createWorkspace('default-user', {
      name: 'My Workspace',
      description: 'Default workspace for demo user',
      slug: 'my-workspace',
    });

    console.log('[DEMO-WORKSPACE] ✅ Demo workspace created successfully');
    console.log('[DEMO-WORKSPACE]    Name:', workspace.name);
    console.log('[DEMO-WORKSPACE]    ID:', workspace.id);
    console.log('[DEMO-WORKSPACE]    Slug:', workspace.slug);
  } catch (error) {
    console.error('[DEMO-WORKSPACE] ❌ Failed to create demo workspace:', error);
    throw error;
  }

  console.log('[DEMO-WORKSPACE] ✅ Demo workspace ready');
  process.exit(0);
}

createDemoWorkspace().catch((error) => {
  console.error('[DEMO-WORKSPACE] Fatal error:', error);
  process.exit(1);
});
