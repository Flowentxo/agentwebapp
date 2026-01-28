/**
 * Emmie Gmail Extension - Background Service Worker
 * Handles API communication, settings, and extension lifecycle
 */

// Configuration
var CONFIG = {
  API_BASE: 'http://localhost:3000',
  AGENT_ID: 'emmie'
};

// Default Settings
var DEFAULT_SETTINGS = {
  apiUrl: CONFIG.API_BASE,
  agentId: CONFIG.AGENT_ID,
  autoDetectEmail: true,
  showFloatingButton: true,
  theme: 'dark',
  shortcuts: {
    openSidebar: 'Alt+E',
    quickCompose: 'Alt+C'
  }
};

// Initialize settings on install or update
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('[Emmie] Extension installed/updated:', details.reason);

  // Always reset settings to ensure correct API URL
  chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, function() {
    console.log('[Emmie] Settings saved/reset to defaults');
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('[Emmie] Message received:', message.type);

  if (message.type === 'GET_SETTINGS') {
    getSettings().then(sendResponse);
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    saveSettings(message.settings).then(sendResponse);
    return true;
  }

  if (message.type === 'CHAT_REQUEST') {
    handleChatRequest(message.data).then(sendResponse);
    return true;
  }

  if (message.type === 'CHECK_API') {
    checkAPIStatus().then(sendResponse);
    return true;
  }

  console.log('[Emmie] Unknown message type:', message.type);
  return false;
});

// Get settings from storage
function getSettings() {
  return new Promise(function(resolve) {
    chrome.storage.sync.get('settings', function(result) {
      if (chrome.runtime.lastError) {
        console.error('[Emmie] Error getting settings:', chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve({ success: true, settings: result.settings || DEFAULT_SETTINGS });
      }
    });
  });
}

// Save settings to storage
function saveSettings(settings) {
  return new Promise(function(resolve) {
    chrome.storage.sync.set({ settings: settings }, function() {
      if (chrome.runtime.lastError) {
        console.error('[Emmie] Error saving settings:', chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Emmie] Settings saved');
        resolve({ success: true });
      }
    });
  });
}

// Handle chat request (for when content script can't make direct requests due to CORS)
function handleChatRequest(data) {
  return new Promise(function(resolve) {
    getSettings().then(function(settingsResult) {
      var settings = settingsResult.settings || DEFAULT_SETTINGS;
      var url = settings.apiUrl + '/api/extension/chat';

      console.log('[Emmie] Settings:', JSON.stringify(settings));
      console.log('[Emmie] Sending chat request to:', url);
      console.log('[Emmie] Message:', data.message ? data.message.substring(0, 100) + '...' : 'empty');

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentId: settings.agentId,
          message: data.message,
          sessionId: data.sessionId || 'gmail-extension'
        })
      })
      .then(function(response) {
        if (!response.ok) {
          return response.text().then(function(errorText) {
            throw new Error('API returned ' + response.status + ': ' + errorText);
          });
        }
        return response.json();
      })
      .then(function(result) {
        console.log('[Emmie] API response received:', result);
        if (result.success) {
          resolve({ success: true, data: result });
        } else {
          throw new Error(result.error?.message || 'Unknown error');
        }
      })
      .catch(function(error) {
        console.error('[Emmie] Chat request failed:', error);
        resolve({ success: false, error: error.message });
      });
    });
  });
}

// Check API status
function checkAPIStatus() {
  return new Promise(function(resolve) {
    getSettings().then(function(settingsResult) {
      var settings = settingsResult.settings;

      fetch(settings.apiUrl + '/api/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(function(response) {
        if (response.ok) {
          resolve({ success: true, status: 'connected' });
        } else {
          resolve({ success: false, status: 'error', code: response.status });
        }
      })
      .catch(function(error) {
        console.error('[Emmie] API check failed:', error);
        resolve({ success: false, status: 'offline', error: error.message });
      });
    });
  });
}

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(function(command) {
  console.log('[Emmie] Command received:', command);

  if (command === 'open-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
      }
    });
  }

  if (command === 'quick-compose') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'QUICK_COMPOSE' });
      }
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
  if (tab.url && tab.url.includes('mail.google.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
  }
});

console.log('[Emmie] Background service worker started');
