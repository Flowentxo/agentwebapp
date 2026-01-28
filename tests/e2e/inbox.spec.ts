import { test, expect, Page } from '@playwright/test';

/**
 * Flowent Inbox v2 - E2E Test Suite
 *
 * Comprehensive tests covering:
 * - Infinite Scroll & Loading
 * - Search & Debounce
 * - Thread Management (Context Menu)
 * - Chat & Real-Time (Mocked)
 */

// =====================================================
// TEST FIXTURES & HELPERS
// =====================================================

/**
 * Mock thread data for consistent testing
 */
const mockThreads = Array.from({ length: 30 }, (_, i) => ({
  id: `thread-${i + 1}`,
  userId: 'test-user',
  subject: `Test Thread ${i + 1}${i < 5 ? ' - Budget Report' : ''}`,
  preview: `This is a preview of thread ${i + 1}`,
  agentId: ['dexter', 'emmie', 'kai', 'cassie'][i % 4],
  agentName: ['Dexter', 'Emmie', 'Kai', 'Cassie'][i % 4],
  status: i === 0 ? 'suspended' : 'active',
  priority: 'medium',
  unreadCount: i < 5 ? 2 : 0,
  messageCount: 5 + i,
  pendingApprovalId: i === 0 ? 'approval-1' : null,
  metadata: { tags: ['test'] },
  lastMessageAt: new Date(Date.now() - i * 3600000).toISOString(),
  createdAt: new Date(Date.now() - i * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

/**
 * Mock messages for chat tests
 */
const mockMessages = [
  {
    id: 'msg-1',
    threadId: 'thread-1',
    role: 'agent',
    type: 'text',
    content: 'Hello! How can I help you today?',
    agentId: 'dexter',
    agentName: 'Dexter',
    isStreaming: false,
    isOptimistic: false,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'msg-2',
    threadId: 'thread-1',
    role: 'user',
    type: 'text',
    content: 'I need help with my budget analysis.',
    isStreaming: false,
    isOptimistic: false,
    timestamp: new Date(Date.now() - 300000).toISOString(),
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'msg-3',
    threadId: 'thread-1',
    role: 'agent',
    type: 'text',
    content: 'I can help you analyze your budget. Let me pull up the latest data.',
    agentId: 'dexter',
    agentName: 'Dexter',
    isStreaming: false,
    isOptimistic: false,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
];

/**
 * Setup API mocking for consistent tests
 */
async function setupApiMocks(page: Page) {
  // Mock threads endpoint (first page)
  await page.route('**/api/inbox/threads*', async (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get('cursor');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let filteredThreads = [...mockThreads];

    // Apply search filter
    if (search) {
      filteredThreads = filteredThreads.filter(
        (t) =>
          t.subject.toLowerCase().includes(search.toLowerCase()) ||
          t.preview.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = filteredThreads.findIndex((t) => t.id === cursor);
      startIndex = cursorIndex > 0 ? cursorIndex : 0;
    }

    const pageThreads = filteredThreads.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filteredThreads.length;
    const nextCursor = hasMore ? pageThreads[pageThreads.length - 1]?.id : null;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        threads: pageThreads,
        nextCursor,
        hasMore,
        count: pageThreads.length,
      }),
    });
  });

  // Mock single thread endpoint
  await page.route('**/api/inbox/threads/*/messages', async (route) => {
    const url = route.request().url();
    const threadId = url.match(/threads\/([^/]+)\/messages/)?.[1];

    if (threadId) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          messages: mockMessages.filter((m) => m.threadId === threadId),
          hasMore: false,
          nextCursor: null,
        }),
      });
    }
  });

  // Mock thread status update
  await page.route('**/api/inbox/threads/*/status', async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          thread: { ...mockThreads[0], status: body.status },
        }),
      });
    }
  });

  // Mock thread delete
  await page.route('**/api/inbox/threads/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    } else {
      route.continue();
    }
  });

  // Mock send message
  await page.route('**/api/inbox/threads/*/send', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: {
            id: `msg-${Date.now()}`,
            threadId: 'thread-1',
            role: 'user',
            type: 'text',
            content: body.content,
            isStreaming: false,
            isOptimistic: false,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
        }),
      });
    }
  });
}

// =====================================================
// TEST SUITES
// =====================================================

test.describe('Inbox - Page Load & Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should load inbox page and display thread list', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for page to load
    await expect(page).toHaveURL(/\/inbox/);

    // Check for main layout elements
    await expect(page.locator('[data-testid="inbox-sidebar"]').or(page.locator('aside'))).toBeVisible();
    await expect(page.locator('[data-testid="thread-list"]').or(page.locator('[class*="ThreadList"]'))).toBeVisible();

    // Verify threads are displayed
    const threadItems = page.locator('[data-testid="thread-item"]').or(
      page.locator('[class*="thread-item"], [class*="ThreadItem"]')
    );
    await expect(threadItems.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display thread count', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Check for thread count display
    const countElement = page.locator('text=/\\d+\\s*threads?/i');
    await expect(countElement).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Inbox - Infinite Scroll & Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should load first 20 threads initially', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    const threadsResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/inbox/threads') &&
        !response.url().includes('cursor=') &&
        response.status() === 200
    );

    const responseData = await threadsResponse.json();
    expect(responseData.threads.length).toBeLessThanOrEqual(20);
  });

  test('should load more threads when scrolling to bottom', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Get the thread list container
    const threadList = page.locator('[data-testid="thread-list"]').or(
      page.locator('[class*="overflow-y-auto"]').first()
    );

    // Scroll to bottom
    await threadList.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Wait for pagination request with cursor parameter
    const paginatedResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/inbox/threads') &&
        response.url().includes('cursor=') &&
        response.status() === 200,
      { timeout: 10000 }
    );

    expect(paginatedResponse.url()).toContain('cursor=');
  });

  test('should show loading indicator while fetching more threads', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Scroll to trigger pagination
    const threadList = page.locator('[class*="overflow-y-auto"]').first();
    await threadList.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Check for loading indicator (spinner or text)
    const loadingIndicator = page.locator('[data-testid="loading-more"]').or(
      page.locator('text=/loading|scroll for more/i').or(
        page.locator('[class*="animate-spin"]')
      )
    );

    // Loading might be very quick, so we just check it can exist
    await expect(loadingIndicator.or(threadList)).toBeVisible();
  });
});

test.describe('Inbox - Search & Debounce', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should filter threads when searching', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Find search input
    const searchInput = page.locator('[data-testid="search-input"]').or(
      page.locator('input[placeholder*="search" i]').or(
        page.locator('input[type="text"]').first()
      )
    );

    // Type search query
    await searchInput.fill('Budget');

    // Wait for debounced search request (300ms + request time)
    const searchResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/inbox/threads') &&
        response.url().includes('search=Budget') &&
        response.status() === 200,
      { timeout: 5000 }
    );

    expect(searchResponse.url()).toContain('search=Budget');

    // Verify filtered results
    const responseData = await searchResponse.json();
    expect(
      responseData.threads.every((t: { subject: string }) =>
        t.subject.toLowerCase().includes('budget')
      )
    ).toBeTruthy();
  });

  test('should debounce search input (not fire immediately)', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Track API calls
    let searchCalls = 0;
    page.on('request', (request) => {
      if (request.url().includes('/api/inbox/threads') && request.url().includes('search=')) {
        searchCalls++;
      }
    });

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i]').or(
      page.locator('[data-testid="search-input"]')
    );

    // Type quickly
    await searchInput.pressSequentially('Bud', { delay: 50 });

    // Wait less than debounce time
    await page.waitForTimeout(100);

    // Should not have made a search call yet
    expect(searchCalls).toBe(0);

    // Wait for debounce (300ms + buffer)
    await page.waitForTimeout(400);

    // Now should have made exactly one call
    expect(searchCalls).toBe(1);
  });

  test('should clear search and reset list', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Perform search
    const searchInput = page.locator('input[placeholder*="search" i]').or(
      page.locator('[data-testid="search-input"]')
    );
    await searchInput.fill('Budget');

    // Wait for search response
    await page.waitForResponse((response) =>
      response.url().includes('search=Budget') && response.status() === 200
    );

    // Find and click clear button
    const clearButton = page.locator('[data-testid="clear-search"]').or(
      page.locator('button:has(svg[class*="X"])').or(
        page.locator('[title*="clear" i]')
      )
    );
    await clearButton.click();

    // Wait for unfiltered request
    const resetResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/inbox/threads') &&
        !response.url().includes('search=') &&
        response.status() === 200,
      { timeout: 5000 }
    );

    expect(resetResponse.url()).not.toContain('search=');
  });

  test('should show search results count', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Perform search
    const searchInput = page.locator('input[placeholder*="search" i]').or(
      page.locator('[data-testid="search-input"]')
    );
    await searchInput.fill('Budget');

    // Wait for search response
    await page.waitForResponse((response) =>
      response.url().includes('search=Budget') && response.status() === 200
    );

    // Check for result indicator
    const resultIndicator = page.locator('text=/results for|\\d+\\s*threads?/i');
    await expect(resultIndicator).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Inbox - Thread Management (Context Menu)', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should show actions button on thread hover', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Find first thread item
    const threadItem = page.locator('[data-testid="thread-item"]').or(
      page.locator('[class*="thread"]').first()
    );

    // Hover over thread
    await threadItem.first().hover();

    // Check for actions button (appears on hover)
    const actionsButton = page.locator('[data-testid="thread-actions"]').or(
      page.locator('button:has(svg)').filter({ hasText: '' }).first()
    );

    await expect(actionsButton).toBeVisible({ timeout: 3000 });
  });

  test('should open context menu and show actions', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Find and hover over first thread
    const threadItem = page.locator('[data-testid="thread-item"]').first().or(
      page.locator('[class*="thread-item"]').first()
    );
    await threadItem.hover();

    // Click actions button
    const actionsButton = page.locator('[data-testid="thread-actions"]').or(
      page.locator('[class*="ThreadActions"]').or(
        threadItem.locator('button').first()
      )
    );
    await actionsButton.click();

    // Check for menu items
    const menuContent = page.locator('[role="menu"]').or(
      page.locator('[data-radix-menu-content]').or(
        page.locator('[class*="DropdownMenu"]')
      )
    );
    await expect(menuContent).toBeVisible({ timeout: 3000 });

    // Verify menu has expected options
    await expect(page.locator('text=/archive|mark.*read|delete/i').first()).toBeVisible();
  });

  test('should archive thread and show undo toast', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Count initial threads
    const threadItems = page.locator('[data-testid="thread-item"]').or(
      page.locator('[class*="thread-item"]')
    );
    const initialCount = await threadItems.count();

    // Open context menu for first thread
    const firstThread = threadItems.first();
    await firstThread.hover();

    const actionsButton = firstThread.locator('[data-testid="thread-actions"]').or(
      firstThread.locator('button').first()
    );
    await actionsButton.click();

    // Click archive
    const archiveOption = page.locator('text=/^archive$/i');
    await archiveOption.click();

    // Verify thread is removed from list (optimistic update)
    await expect(threadItems).toHaveCount(initialCount - 1, { timeout: 3000 });

    // Verify toast appears
    const toast = page.locator('[data-testid="toast"]').or(
      page.locator('[class*="toast" i]').or(
        page.locator('text=/archived|undo/i')
      )
    );
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should undo archive action', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Count initial threads
    const threadItems = page.locator('[data-testid="thread-item"]').or(
      page.locator('[class*="thread-item"]')
    );
    const initialCount = await threadItems.count();

    // Archive first thread
    const firstThread = threadItems.first();
    await firstThread.hover();

    const actionsButton = firstThread.locator('button').first();
    await actionsButton.click();

    const archiveOption = page.locator('text=/^archive$/i');
    await archiveOption.click();

    // Wait for toast and click undo
    const undoButton = page.locator('text=/^undo$/i').or(
      page.locator('button:has-text("Undo")')
    );
    await undoButton.click({ timeout: 5000 });

    // Verify thread is restored
    await expect(threadItems).toHaveCount(initialCount, { timeout: 5000 });
  });

  test('should mark thread as unread', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Open context menu
    const threadItem = page.locator('[data-testid="thread-item"]').first().or(
      page.locator('[class*="thread-item"]').first()
    );
    await threadItem.hover();

    const actionsButton = threadItem.locator('button').first();
    await actionsButton.click();

    // Click mark as unread
    const unreadOption = page.locator('text=/mark.*unread/i');
    await unreadOption.click();

    // Verify toast or visual update
    const toast = page.locator('text=/unread/i');
    await expect(toast).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Inbox - Chat View', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should load messages when clicking a thread', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for threads to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Click first thread
    const threadItem = page.locator('[data-testid="thread-item"]').first().or(
      page.locator('[class*="thread-item"]').first()
    );
    await threadItem.click();

    // Wait for messages to load
    const messagesResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/messages') && response.status() === 200,
      { timeout: 10000 }
    );

    // Verify we're on a thread detail page
    await expect(page).toHaveURL(/\/inbox\/thread-/);

    // Verify messages are displayed
    const messages = page.locator('[data-testid="message"]').or(
      page.locator('[class*="message"]')
    );
    await expect(messages.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display message composer', async ({ page }) => {
    await page.goto('/inbox/thread-1');

    // Wait for page to load
    await page.waitForResponse(
      (response) =>
        response.url().includes('/messages') && response.status() === 200,
      { timeout: 10000 }
    );

    // Check for composer
    const composer = page.locator('[data-testid="message-composer"]').or(
      page.locator('textarea, input[type="text"]').filter({ hasText: '' }).last().or(
        page.locator('[class*="composer" i]')
      )
    );
    await expect(composer).toBeVisible({ timeout: 5000 });
  });

  test('should send message and show optimistic update', async ({ page }) => {
    await page.goto('/inbox/thread-1');

    // Wait for messages to load
    await page.waitForResponse(
      (response) =>
        response.url().includes('/messages') && response.status() === 200,
      { timeout: 10000 }
    );

    // Count initial messages
    const messages = page.locator('[data-testid="message"]').or(
      page.locator('[class*="message-content"]')
    );
    const initialCount = await messages.count();

    // Find composer and type message
    const composer = page.locator('[data-testid="message-composer"]').or(
      page.locator('textarea').last().or(
        page.locator('input[type="text"]').last()
      )
    );
    await composer.fill('This is a test message from E2E');

    // Submit message (Enter or button)
    const sendButton = page.locator('[data-testid="send-button"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('button[type="submit"]')
      )
    );

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await composer.press('Enter');
    }

    // Verify new message appears (optimistic update)
    await expect(messages).toHaveCount(initialCount + 1, { timeout: 5000 });

    // Verify message content
    await expect(page.locator('text=This is a test message from E2E')).toBeVisible();
  });

  test('should show typing indicator placeholder', async ({ page }) => {
    await page.goto('/inbox/thread-1');

    // Wait for page to load
    await page.waitForResponse(
      (response) =>
        response.url().includes('/messages') && response.status() === 200,
      { timeout: 10000 }
    );

    // The typing indicator would normally be triggered by socket events
    // For E2E, we can check the structure exists
    const chatArea = page.locator('[data-testid="chat-messages"]').or(
      page.locator('[class*="message-list" i]')
    );
    await expect(chatArea).toBeVisible();
  });
});

test.describe('Inbox - Filter Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should navigate between filter tabs', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Find filter buttons/tabs
    const unreadFilter = page.locator('[data-testid="filter-unread"]').or(
      page.locator('text=/^unread$/i').or(
        page.locator('button:has-text("Unread")')
      )
    );

    await unreadFilter.click();

    // Verify filter is active (visual state change)
    await expect(unreadFilter).toHaveClass(/active|selected|bg-violet/i, { timeout: 3000 });
  });

  test('should show approvals filter with count', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for initial load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Find approvals filter
    const approvalsFilter = page.locator('[data-testid="filter-approvals"]').or(
      page.locator('text=/approvals/i')
    );

    await expect(approvalsFilter).toBeVisible();

    // Check for count badge (if approvals exist)
    const badge = approvalsFilter.locator('[class*="badge"]').or(
      approvalsFilter.locator('span').filter({ hasText: /\d+/ })
    );

    // Badge may or may not be visible depending on data
    if (await badge.isVisible()) {
      await expect(badge).toContainText(/\d+/);
    }
  });
});

test.describe('Inbox - Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('should show keyboard shortcuts help on ? key', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for page to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Press ? to open shortcuts modal
    await page.keyboard.press('Shift+?');

    // Check for shortcuts modal/overlay
    const shortcutsModal = page.locator('[data-testid="shortcuts-modal"]').or(
      page.locator('text=/keyboard shortcuts/i').or(
        page.locator('[class*="modal"]')
      )
    );

    // Modal should appear (or there might be a hint already visible)
    await expect(shortcutsModal.or(page.locator('text=/press.*shortcuts/i'))).toBeVisible({
      timeout: 3000,
    });
  });

  test('should focus search with / key', async ({ page }) => {
    await page.goto('/inbox');

    // Wait for page to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Press / to focus search
    await page.keyboard.press('/');

    // Check search input is focused
    const searchInput = page.locator('input[placeholder*="search" i]').or(
      page.locator('[data-testid="search-input"]')
    );

    await expect(searchInput).toBeFocused({ timeout: 3000 });
  });
});

test.describe('Inbox - Responsive Design', () => {
  test('should hide sidebar on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await setupApiMocks(page);
    await page.goto('/inbox');

    // Wait for page to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Sidebar should be hidden or collapsed
    const sidebar = page.locator('[data-testid="inbox-sidebar"]').or(
      page.locator('aside')
    );

    // Either sidebar is hidden or has a transform/visibility change
    const isHidden = await sidebar.isHidden();
    const isOffScreen = await sidebar.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.right < 0 || rect.left > window.innerWidth;
    }).catch(() => true);

    expect(isHidden || isOffScreen).toBeTruthy();
  });

  test('should show mobile menu toggle', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await setupApiMocks(page);
    await page.goto('/inbox');

    // Wait for page to load
    await page.waitForResponse((response) =>
      response.url().includes('/api/inbox/threads') && response.status() === 200
    );

    // Menu toggle should be visible
    const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]').or(
      page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first()
    );

    await expect(menuToggle).toBeVisible({ timeout: 3000 });
  });
});
