/**
 * GOOGLE TASKS SERVICE
 * 
 * Handles Google Tasks operations: list, create, update tasks
 */

import { google } from 'googleapis';
import { getDb } from '../../lib/db/connection';
import { integrations } from '../../lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '../../lib/auth/oauth';
import { getProviderConfig } from '../../lib/integrations/settings';

const createOAuthClient = (clientId: string, clientSecret: string, redirectUri: string) => {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

interface Task {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: 'needsAction' | 'completed';
  completed?: string;
}

interface TaskList {
  id: string;
  title: string;
}

export class GoogleTasksService {
  private static instance: GoogleTasksService;

  private constructor() {}

  public static getInstance(): GoogleTasksService {
    if (!GoogleTasksService.instance) {
      GoogleTasksService.instance = new GoogleTasksService();
    }
    return GoogleTasksService.instance;
  }

  private async getConfig(userId: string) {
    const config = await getProviderConfig(userId, 'google');
    
    if (!config && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback',
        provider: 'google'
      };
    }

    if (!config) {
      throw new Error('Google configuration not found for this user.');
    }
    return config;
  }

  private async getAccessToken(userId: string): Promise<string> {
    const db = getDb();
    
    const [integration] = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.userId, userId),
          eq(integrations.provider, 'google'),
          eq(integrations.status, 'connected')
        )
      );

    if (!integration) {
      throw new Error('Google not connected. Please connect your Google account first.');
    }

    return decrypt(integration.accessToken);
  }

  /**
   * List all task lists
   */
  public async listTaskLists(userId: string): Promise<{ success: boolean; taskLists?: TaskList[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

      const response = await tasks.tasklists.list({ maxResults: 100 });

      const taskLists: TaskList[] = (response.data.items || []).map(list => ({
        id: list.id || '',
        title: list.title || '',
      }));

      return { success: true, taskLists };
    } catch (error: any) {
      console.error('[GOOGLE_TASKS] List task lists failed:', error);
      return { success: false, error: error.message || 'Failed to list task lists' };
    }
  }

  /**
   * List tasks in a task list
   */
  public async listTasks(
    userId: string,
    taskListId: string = '@default'
  ): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

      const response = await tasksApi.tasks.list({
        tasklist: taskListId,
        maxResults: 100,
        showCompleted: false,
      });

      const taskItems: Task[] = (response.data.items || []).map(task => ({
        id: task.id || '',
        title: task.title || '',
        notes: task.notes || undefined,
        due: task.due || undefined,
        status: (task.status || 'needsAction') as 'needsAction' | 'completed',
        completed: task.completed || undefined,
      }));

      return { success: true, tasks: taskItems };
    } catch (error: any) {
      console.error('[GOOGLE_TASKS] List tasks failed:', error);
      return { success: false, error: error.message || 'Failed to list tasks' };
    }
  }

  /**
   * Create a new task
   */
  public async createTask(
    userId: string,
    taskData: {
      title: string;
      notes?: string;
      due?: string | Date;
    },
    taskListId: string = '@default'
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

      const response = await tasksApi.tasks.insert({
        tasklist: taskListId,
        requestBody: {
          title: taskData.title,
          notes: taskData.notes,
          due: taskData.due ? new Date(taskData.due).toISOString() : undefined,
        },
      });

      console.log(`[GOOGLE_TASKS] Task created: ${response.data.id}`);

      return { success: true, taskId: response.data.id || undefined };
    } catch (error: any) {
      console.error('[GOOGLE_TASKS] Create task failed:', error);
      return { success: false, error: error.message || 'Failed to create task' };
    }
  }

  /**
   * Complete a task
   */
  public async completeTask(
    userId: string,
    taskId: string,
    taskListId: string = '@default'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const config = await this.getConfig(userId);
      const oauth2Client = createOAuthClient(config.clientId, config.clientSecret, config.redirectUri);
      oauth2Client.setCredentials({ access_token: accessToken });

      const tasksApi = google.tasks({ version: 'v1', auth: oauth2Client });

      await tasksApi.tasks.patch({
        tasklist: taskListId,
        task: taskId,
        requestBody: {
          status: 'completed',
        },
      });

      console.log(`[GOOGLE_TASKS] Task completed: ${taskId}`);

      return { success: true };
    } catch (error: any) {
      console.error('[GOOGLE_TASKS] Complete task failed:', error);
      return { success: false, error: error.message || 'Failed to complete task' };
    }
  }
}

export const googleTasksService = GoogleTasksService.getInstance();
