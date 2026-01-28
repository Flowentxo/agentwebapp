/**
 * Emmie Gmail Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Tab switching
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');
    });
  });

  // Toggle switches
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
    });
  });

  // Check API status
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_API' });

    if (response.success && response.status === 'connected') {
      statusDot.classList.remove('checking', 'offline');
      statusText.textContent = 'Connected to Sintra AI';
    } else {
      statusDot.classList.remove('checking');
      statusDot.classList.add('offline');
      statusText.textContent = 'Server offline - Start the backend';
    }
  } catch (error) {
    statusDot.classList.remove('checking');
    statusDot.classList.add('offline');
    statusText.textContent = 'Cannot reach server';
  }

  // Load settings
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (response.success && response.settings) {
      document.getElementById('api-url').value = response.settings.apiUrl || 'http://localhost:3000';
      document.getElementById('toggle-fab').classList.toggle('active', response.settings.showFloatingButton !== false);
      document.getElementById('toggle-autodetect').classList.toggle('active', response.settings.autoDetectEmail !== false);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Save settings
  document.getElementById('btn-save').addEventListener('click', async () => {
    const settings = {
      apiUrl: document.getElementById('api-url').value,
      showFloatingButton: document.getElementById('toggle-fab').classList.contains('active'),
      autoDetectEmail: document.getElementById('toggle-autodetect').classList.contains('active'),
      agentId: 'emmie'
    };

    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });

      // Visual feedback
      const btn = document.getElementById('btn-save');
      const originalText = btn.querySelector('span').textContent;
      btn.querySelector('span').textContent = 'Saved!';
      setTimeout(() => {
        btn.querySelector('span').textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  });

  // Quick action buttons - send message to content script
  const actions = ['compose', 'reply', 'summarize', 'improve'];

  actions.forEach(action => {
    document.getElementById(`btn-${action}`).addEventListener('click', async () => {
      // Get active Gmail tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab?.url?.includes('mail.google.com')) {
        chrome.tabs.sendMessage(tab.id, { type: 'QUICK_ACTION', action });
        window.close(); // Close popup
      } else {
        // Open Gmail if not on it
        chrome.tabs.create({ url: 'https://mail.google.com' });
      }
    });
  });
});
