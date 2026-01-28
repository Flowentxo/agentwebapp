# Emmie - AI Email Assistant for Gmail

A Chrome extension that integrates the Emmie AI email assistant directly into Gmail.

## Features

- **AI-Powered Compose**: Let Emmie help you write professional emails
- **Smart Reply**: Generate contextual replies based on email content
- **Email Summarization**: Get quick summaries of long email threads
- **Writing Improvement**: Enhance your email drafts with AI suggestions
- **Seamless Gmail Integration**: Works directly within the Gmail interface

## Installation

### Development Mode

1. **Generate Icons** (first time only):
   - Open `icons/create-icons.html` in your browser
   - Download all 4 icon sizes (16, 32, 48, 128)
   - Save them in the `icons/` folder as `emmie-16.png`, `emmie-32.png`, etc.

2. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `emmie-gmail` folder

3. **Start the Backend**:
   ```bash
   cd c:\Users\luis\Desktop\AIAgentwebapp
   npm run dev
   ```

4. **Use in Gmail**:
   - Go to [Gmail](https://mail.google.com)
   - Click the pink Emmie button in the bottom right
   - Start chatting with Emmie!

## Usage

### Quick Actions

| Action | Description |
|--------|-------------|
| **Compose** | Start a new email with AI assistance |
| **Smart Reply** | Generate a reply to the current email |
| **Summarize** | Get a summary of the email thread |
| **Improve** | Enhance your draft with AI suggestions |

### Keyboard Shortcuts

- `Alt+E` - Open/close Emmie sidebar
- `Alt+C` - Quick compose with AI

### Context Awareness

Emmie automatically detects:
- The currently open email
- Email subject and sender
- Email content for context

## Configuration

Click the Emmie extension icon to access settings:

- **API Server URL**: Backend server address (default: `http://localhost:4000`)
- **Show floating button**: Toggle the FAB visibility
- **Auto-detect emails**: Automatically detect email context

## API Requirements

The extension requires the Sintra AI backend to be running:

```bash
# Start the full stack
cd c:\Users\luis\Desktop\AIAgentwebapp
npm run dev
```

The backend should be accessible at `http://localhost:4000`.

## File Structure

```
emmie-gmail/
├── manifest.json        # Extension manifest
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
├── src/
│   ├── content.js      # Gmail content script
│   └── background.js   # Service worker
├── styles/
│   └── emmie.css       # Sidebar styles
├── icons/
│   ├── emmie-16.png
│   ├── emmie-32.png
│   ├── emmie-48.png
│   └── emmie-128.png
└── README.md
```

## Development

### Debugging

1. Open `chrome://extensions/`
2. Find "Emmie - AI Email Assistant"
3. Click "Inspect views: service worker" for background script
4. Open Gmail, right-click → Inspect for content script

### Console Logs

All logs are prefixed with `[Emmie]` for easy filtering.

## Permissions

The extension requires:
- `storage` - Save settings
- `activeTab` - Access current Gmail tab
- `identity` - Future OAuth integration
- Host access to `mail.google.com`

## Troubleshooting

### Extension not loading?
- Make sure you're in Developer mode
- Check for errors in `chrome://extensions/`

### Can't connect to API?
- Verify the backend is running on port 4000
- Check the API URL in extension settings

### Sidebar not appearing?
- Refresh Gmail page
- Check console for errors

## License

Part of the Sintra AI Agent System.
