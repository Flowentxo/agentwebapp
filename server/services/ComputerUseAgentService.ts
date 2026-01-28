/**
 * COMPUTER USE AGENT SERVICE
 *
 * Browser automation with Puppeteer for web scraping, testing, and automation
 */

import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface BrowserSession {
  id: string;
  browser: Browser;
  pages: Map<string, Page>;
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
// COMPUTER USE AGENT SERVICE
// ============================================================

export class ComputerUseAgentService {
  private sessions: Map<string, BrowserSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup inactive sessions every 10 minutes
    setInterval(() => this.cleanupInactiveSessions(), 10 * 60 * 1000);
  }

  /**
   * Create new browser session
   */
  async createSession(options?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
  }): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[COMPUTER_USE] Creating browser session: ${sessionId}`);

    const browser = await puppeteer.launch({
      headless: options?.headless ?? true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const session: BrowserSession = {
      id: sessionId,
      browser,
      pages: new Map(),
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Create default page
    const pages = await browser.pages();
    const defaultPage = pages[0] || (await browser.newPage());

    if (options?.viewport) {
      await defaultPage.setViewport(options.viewport);
    } else {
      await defaultPage.setViewport({ width: 1920, height: 1080 });
    }

    session.pages.set('default', defaultPage);
    this.sessions.set(sessionId, session);

    console.log(`[COMPUTER_USE] ✅ Browser session created: ${sessionId}`);

    return sessionId;
  }

  /**
   * Get or create page in session
   */
  private async getPage(sessionId: string, pageId: string = 'default'): Promise<Page> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.lastActivity = new Date();

    let page = session.pages.get(pageId);
    if (!page) {
      page = await session.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      session.pages.set(pageId, page);
    }

    return page;
  }

  /**
   * Navigate to URL
   */
  async navigate(
    sessionId: string,
    url: string,
    options?: NavigationOptions
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push(`Navigating to: ${url}`);

      const page = await this.getPage(sessionId);

      await page.goto(url, {
        waitUntil: options?.waitUntil || 'networkidle2',
        timeout: options?.timeout || 30000,
      });

      const title = await page.title();
      logs.push(`Page loaded: ${title}`);

      return {
        success: true,
        data: { title, url: page.url() },
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Click element
   */
  async click(
    sessionId: string,
    selector: ElementSelector
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push(`Clicking: ${selector.selector}`);

      const page = await this.getPage(sessionId);

      await page.waitForSelector(selector.selector, {
        timeout: selector.timeout || 10000,
      });

      if (selector.index !== undefined) {
        const elements = await page.$$(selector.selector);
        if (elements[selector.index]) {
          await elements[selector.index].click();
          logs.push(`Clicked element at index ${selector.index}`);
        } else {
          throw new Error(`Element not found at index ${selector.index}`);
        }
      } else {
        await page.click(selector.selector);
        logs.push(`Clicked: ${selector.selector}`);
      }

      return {
        success: true,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Type text into input
   */
  async type(
    sessionId: string,
    selector: ElementSelector,
    text: string,
    options?: { delay?: number }
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push(`Typing into: ${selector.selector}`);

      const page = await this.getPage(sessionId);

      await page.waitForSelector(selector.selector, {
        timeout: selector.timeout || 10000,
      });

      await page.type(selector.selector, text, {
        delay: options?.delay || 50,
      });

      logs.push(`Typed text into: ${selector.selector}`);

      return {
        success: true,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Fill form
   */
  async fillForm(
    sessionId: string,
    formData: FormData
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      const page = await this.getPage(sessionId);

      for (const [selector, value] of Object.entries(formData)) {
        logs.push(`Filling field: ${selector}`);

        await page.waitForSelector(selector, { timeout: 10000 });

        if (typeof value === 'boolean') {
          // Checkbox/radio
          const isChecked = await page.$eval(selector, (el: any) => el.checked);
          if (isChecked !== value) {
            await page.click(selector);
          }
        } else {
          // Input field
          await page.focus(selector);
          await page.evaluate((sel) => {
            const element = document.querySelector(sel) as HTMLInputElement;
            if (element) element.value = '';
          }, selector);
          await page.type(selector, String(value));
        }
      }

      logs.push('Form filled successfully');

      return {
        success: true,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(
    sessionId: string,
    options?: ScreenshotOptions
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push('Taking screenshot...');

      const page = await this.getPage(sessionId);

      const screenshot = await page.screenshot({
        fullPage: options?.fullPage ?? false,
        type: options?.type || 'png',
        quality: options?.type === 'jpeg' ? options?.quality || 80 : undefined,
        encoding: 'base64',
      });

      logs.push('Screenshot captured');

      return {
        success: true,
        screenshot: screenshot as string,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Scrape data from page
   */
  async scrape(
    sessionId: string,
    scrapeConfig: {
      selector: string;
      attribute?: string;
      multiple?: boolean;
    }
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push(`Scraping: ${scrapeConfig.selector}`);

      const page = await this.getPage(sessionId);

      await page.waitForSelector(scrapeConfig.selector, { timeout: 10000 });

      let data: any;

      if (scrapeConfig.multiple) {
        if (scrapeConfig.attribute) {
          data = await page.$$eval(
            scrapeConfig.selector,
            (elements, attr) => elements.map((el) => el.getAttribute(attr)),
            scrapeConfig.attribute
          );
        } else {
          data = await page.$$eval(scrapeConfig.selector, (elements) =>
            elements.map((el) => el.textContent?.trim())
          );
        }
      } else {
        if (scrapeConfig.attribute) {
          data = await page.$eval(
            scrapeConfig.selector,
            (el, attr) => el.getAttribute(attr),
            scrapeConfig.attribute
          );
        } else {
          data = await page.$eval(scrapeConfig.selector, (el) => el.textContent?.trim());
        }
      }

      logs.push(`Scraped ${scrapeConfig.multiple ? data.length : 1} item(s)`);

      return {
        success: true,
        data,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Execute custom JavaScript
   */
  async executeScript(
    sessionId: string,
    script: string
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      logs.push('Executing custom script...');

      const page = await this.getPage(sessionId);

      const result = await page.evaluate(script);

      logs.push('Script executed successfully');

      return {
        success: true,
        data: result,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Wait for selector or time
   */
  async wait(
    sessionId: string,
    options: { selector?: string; timeout?: number }
  ): Promise<AutomationResult> {
    const logs: string[] = [];

    try {
      const page = await this.getPage(sessionId);

      if (options.selector) {
        logs.push(`Waiting for selector: ${options.selector}`);
        await page.waitForSelector(options.selector, {
          timeout: options.timeout || 10000,
        });
        logs.push(`Selector found: ${options.selector}`);
      } else if (options.timeout) {
        logs.push(`Waiting for ${options.timeout}ms...`);
        await new Promise((resolve) => setTimeout(resolve, options.timeout));
        logs.push('Wait completed');
      }

      return {
        success: true,
        logs,
      };
    } catch (error: any) {
      logs.push(`Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        logs,
      };
    }
  }

  /**
   * Execute automation workflow
   */
  async executeWorkflow(
    sessionId: string,
    tasks: AutomationTask[]
  ): Promise<AutomationResult> {
    const allLogs: string[] = [];
    const results: any[] = [];

    try {
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        allLogs.push(`[Task ${i + 1}/${tasks.length}] ${task.type}`);

        let result: AutomationResult;

        switch (task.type) {
          case 'navigate':
            result = await this.navigate(sessionId, task.params.url, task.params.options);
            break;

          case 'click':
            result = await this.click(sessionId, task.params.selector);
            break;

          case 'type':
            result = await this.type(
              sessionId,
              task.params.selector,
              task.params.text,
              task.params.options
            );
            break;

          case 'screenshot':
            result = await this.screenshot(sessionId, task.params.options);
            break;

          case 'scrape':
            result = await this.scrape(sessionId, task.params.config);
            break;

          case 'wait':
            result = await this.wait(sessionId, task.params.options);
            break;

          case 'execute':
            result = await this.executeScript(sessionId, task.params.script);
            break;

          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        allLogs.push(...result.logs);
        results.push({ task: i + 1, type: task.type, ...result });

        if (!result.success) {
          throw new Error(`Task ${i + 1} failed: ${result.error}`);
        }
      }

      return {
        success: true,
        data: results,
        logs: allLogs,
      };
    } catch (error: any) {
      allLogs.push(`Workflow failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        data: results,
        logs: allLogs,
      };
    }
  }

  /**
   * Close session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(sessionId);
      console.log(`[COMPUTER_USE] Session closed: ${sessionId}`);
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): {
    id: string;
    pageCount: number;
    createdAt: Date;
    lastActivity: Date;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      pageCount: session.pages.size,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    };
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): Array<{
    id: string;
    pageCount: number;
    createdAt: Date;
    lastActivity: Date;
  }> {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      pageCount: session.pages.size,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    }));
  }

  /**
   * Cleanup inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();

      if (inactiveTime > this.sessionTimeout) {
        console.log(`[COMPUTER_USE] Cleaning up inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  /**
   * Shutdown service (close all sessions)
   */
  async shutdown(): Promise<void> {
    console.log('[COMPUTER_USE] Shutting down...');

    for (const sessionId of this.sessions.keys()) {
      await this.closeSession(sessionId);
    }

    console.log('[COMPUTER_USE] Shutdown complete');
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const computerUseAgent = new ComputerUseAgentService();
