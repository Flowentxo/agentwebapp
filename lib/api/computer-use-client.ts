/**
 * COMPUTER USE CLIENT API
 *
 * Client-side functions for browser automation and web scraping
 */

import { apiClient } from './client';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface BrowserSession {
  id: string;
  pageCount: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  quality?: number;
  type?: 'png' | 'jpeg';
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  timeout?: number;
}

export interface ElementSelector {
  selector: string;
  index?: number;
  timeout?: number;
}

export interface FormData {
  [key: string]: string | boolean | number;
}

export interface AutomationTask {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'scrape' | 'wait' | 'execute';
  params: any;
}

export interface AutomationResult {
  success: boolean;
  data?: any;
  error?: string;
  screenshot?: string;
  logs: string[];
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Create new browser session
 */
export async function createSession(options?: {
  headless?: boolean;
  viewport?: { width: number; height: number };
}): Promise<{
  success: boolean;
  sessionId: string;
  message: string;
}> {
  const { data } = await apiClient.post('/computer-use/sessions', options || {});
  return data;
}

/**
 * Get all active sessions
 */
export async function getActiveSessions(): Promise<{
  success: boolean;
  sessions: BrowserSession[];
  count: number;
}> {
  const { data } = await apiClient.get('/computer-use/sessions');
  return data;
}

/**
 * Get session info
 */
export async function getSessionInfo(sessionId: string): Promise<{
  success: boolean;
  session: BrowserSession;
}> {
  const { data } = await apiClient.get(`/computer-use/sessions/${sessionId}`);
  return data;
}

/**
 * Close session
 */
export async function closeSession(sessionId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.delete(`/computer-use/sessions/${sessionId}`);
  return data;
}

// ============================================================
// AUTOMATION ACTIONS
// ============================================================

/**
 * Navigate to URL
 */
export async function navigate(
  sessionId: string,
  url: string,
  options?: NavigationOptions
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/navigate', {
    sessionId,
    url,
    options,
  });
  return data;
}

/**
 * Click element
 */
export async function click(
  sessionId: string,
  selector: string,
  index?: number,
  timeout?: number
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/click', {
    sessionId,
    selector,
    index,
    timeout,
  });
  return data;
}

/**
 * Type text into input
 */
export async function type(
  sessionId: string,
  selector: string,
  text: string,
  delay?: number,
  timeout?: number
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/type', {
    sessionId,
    selector,
    text,
    delay,
    timeout,
  });
  return data;
}

/**
 * Fill form with data
 */
export async function fillForm(
  sessionId: string,
  formData: FormData
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/fill-form', {
    sessionId,
    formData,
  });
  return data;
}

/**
 * Take screenshot
 */
export async function screenshot(
  sessionId: string,
  options?: ScreenshotOptions
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/screenshot', {
    sessionId,
    ...options,
  });
  return data;
}

/**
 * Scrape data from page
 */
export async function scrape(
  sessionId: string,
  selector: string,
  attribute?: string,
  multiple?: boolean
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/scrape', {
    sessionId,
    selector,
    attribute,
    multiple,
  });
  return data;
}

/**
 * Execute custom JavaScript
 */
export async function executeScript(
  sessionId: string,
  script: string
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/execute-script', {
    sessionId,
    script,
  });
  return data;
}

/**
 * Wait for selector or time
 */
export async function wait(
  sessionId: string,
  selector?: string,
  timeout?: number
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/wait', {
    sessionId,
    selector,
    timeout,
  });
  return data;
}

/**
 * Execute automation workflow
 */
export async function executeWorkflow(
  sessionId: string,
  tasks: AutomationTask[]
): Promise<AutomationResult> {
  const { data } = await apiClient.post('/computer-use/workflow', {
    sessionId,
    tasks,
  });
  return data;
}

// ============================================================
// WORKFLOW HELPERS
// ============================================================

/**
 * Helper: Build automation workflow
 */
export class WorkflowBuilder {
  private tasks: AutomationTask[] = [];

  navigate(url: string, options?: NavigationOptions): this {
    this.tasks.push({
      type: 'navigate',
      params: { url, options },
    });
    return this;
  }

  click(selector: string, index?: number, timeout?: number): this {
    this.tasks.push({
      type: 'click',
      params: { selector: { selector, index, timeout } },
    });
    return this;
  }

  type(selector: string, text: string, delay?: number, timeout?: number): this {
    this.tasks.push({
      type: 'type',
      params: {
        selector: { selector, timeout },
        text,
        options: { delay },
      },
    });
    return this;
  }

  screenshot(options?: ScreenshotOptions): this {
    this.tasks.push({
      type: 'screenshot',
      params: { options },
    });
    return this;
  }

  scrape(selector: string, attribute?: string, multiple?: boolean): this {
    this.tasks.push({
      type: 'scrape',
      params: {
        config: { selector, attribute, multiple },
      },
    });
    return this;
  }

  wait(selector?: string, timeout?: number): this {
    this.tasks.push({
      type: 'wait',
      params: { options: { selector, timeout } },
    });
    return this;
  }

  executeScript(script: string): this {
    this.tasks.push({
      type: 'execute',
      params: { script },
    });
    return this;
  }

  build(): AutomationTask[] {
    return this.tasks;
  }

  async execute(sessionId: string): Promise<AutomationResult> {
    return executeWorkflow(sessionId, this.tasks);
  }
}

// ============================================================
// PRESET WORKFLOWS
// ============================================================

/**
 * Preset: Login workflow
 */
export function loginWorkflow(
  loginUrl: string,
  usernameSelector: string,
  passwordSelector: string,
  submitSelector: string,
  username: string,
  password: string
): AutomationTask[] {
  return new WorkflowBuilder()
    .navigate(loginUrl)
    .wait(usernameSelector, 5000)
    .type(usernameSelector, username)
    .type(passwordSelector, password)
    .click(submitSelector)
    .wait(undefined, 2000)
    .screenshot({ fullPage: true })
    .build();
}

/**
 * Preset: Form submission workflow
 */
export function formSubmissionWorkflow(
  formUrl: string,
  formData: Record<string, string>,
  submitSelector: string
): AutomationTask[] {
  const builder = new WorkflowBuilder().navigate(formUrl);

  // Fill all form fields
  Object.entries(formData).forEach(([selector, value]) => {
    builder.type(selector, value);
  });

  return builder
    .click(submitSelector)
    .wait(undefined, 2000)
    .screenshot()
    .build();
}

/**
 * Preset: Web scraping workflow
 */
export function scrapingWorkflow(
  url: string,
  scrapeConfig: Array<{
    selector: string;
    attribute?: string;
    multiple?: boolean;
  }>
): AutomationTask[] {
  const builder = new WorkflowBuilder().navigate(url).wait(undefined, 2000);

  scrapeConfig.forEach((config) => {
    builder.scrape(config.selector, config.attribute, config.multiple);
  });

  return builder.build();
}
