'use client';

import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Code,
  Table,
  Hash,
  Sparkles,
  FileText,
  Image,
  Link,
  Bold,
  Italic,
  List
} from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => Promise<void>;
  disabled?: boolean;
  agentName?: string;
}

export function ChatInput({ onSend, disabled, agentName = 'Dexter' }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const promptSnippets = [
    { label: 'Analyze trends', text: 'Analyze the data trends for ' },
    { label: 'Calculate ROI', text: 'Calculate the ROI based on ' },
    { label: 'Generate report', text: 'Generate a detailed report about ' },
    { label: 'Compare metrics', text: 'Compare the following metrics: ' }
  ];

  const handleSubmit = async () => {
    if (!message.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSend(message.trim());
      setMessage('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const insertText = (text: string) => {
    const start = textareaRef.current?.selectionStart || message.length;
    const end = textareaRef.current?.selectionEnd || message.length;
    const newMessage = message.slice(0, start) + text + message.slice(end);
    setMessage(newMessage);

    // Set focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = start + text.length;
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const insertFormatting = (format: string) => {
    const selection = window.getSelection()?.toString() || '';
    let formattedText = '';

    switch (format) {
      case 'code':
        formattedText = selection ? `\`${selection}\`` : '```\n// Code here\n```';
        break;
      case 'table':
        formattedText = '\n| Column 1 | Column 2 |\n|----------|----------|\n| Data 1   | Data 2   |\n';
        break;
      case 'bold':
        formattedText = selection ? `**${selection}**` : '**text**';
        break;
      case 'italic':
        formattedText = selection ? `*${selection}*` : '*text*';
        break;
      case 'list':
        formattedText = '\n- Item 1\n- Item 2\n- Item 3\n';
        break;
      default:
        break;
    }

    insertText(formattedText);
  };

  return (
    <div className="chat-input-wrapper">
      {/* Utility Bar */}
      <div className="utility-bar">
        <div className="utility-group">
          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Attach file"
            onClick={() => {
              // TODO: Implement file upload
              alert('File upload coming soon!');
            }}
          >
            <Paperclip size={16} />
            <span className="utility-label">Attach</span>
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Insert image"
            onClick={() => alert('Image upload coming soon!')}
          >
            <Image size={16} />
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Add link"
            onClick={() => insertText('[Link text](https://)')}
          >
            <Link size={16} />
          </button>
        </div>

        <div className="utility-divider" />

        <div className="utility-group">
          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Insert code block"
            onClick={() => insertFormatting('code')}
          >
            <Code size={16} />
            <span className="utility-label">Code</span>
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Insert table"
            onClick={() => insertFormatting('table')}
          >
            <Table size={16} />
            <span className="utility-label">Table</span>
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Bold text"
            onClick={() => insertFormatting('bold')}
          >
            <Bold size={16} />
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Italic text"
            onClick={() => insertFormatting('italic')}
          >
            <Italic size={16} />
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Insert list"
            onClick={() => insertFormatting('list')}
          >
            <List size={16} />
          </button>
        </div>

        <div className="utility-divider" />

        <div className="utility-group">
          <button
            className="utility-button highlight"
            disabled={disabled || isSubmitting}
            title="Prompt snippets"
            onClick={() => setShowPrompts(!showPrompts)}
          >
            <Sparkles size={16} />
            <span className="utility-label">Prompts</span>
          </button>

          <button
            className="utility-button"
            disabled={disabled || isSubmitting}
            title="Macros"
            onClick={() => alert('Macros coming soon!')}
          >
            <Hash size={16} />
            <span className="utility-label">Macros</span>
          </button>
        </div>
      </div>

      {/* Prompt Snippets Dropdown */}
      {showPrompts && (
        <div className="prompts-dropdown">
          <div className="prompts-header">Quick prompts for {agentName}</div>
          <div className="prompts-list">
            {promptSnippets.map((prompt) => (
              <button
                key={prompt.label}
                className="prompt-item"
                onClick={() => {
                  insertText(prompt.text);
                  setShowPrompts(false);
                }}
              >
                <FileText size={14} />
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="chat-input-container compact">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${agentName} anything... (Shift+Enter for new line)`}
          className="chat-textarea compact"
          disabled={disabled || isSubmitting}
          rows={1}
          maxLength={10000}
        />

        <div className="input-actions">
          <button
            className="voice-button-compact"
            disabled={disabled || isSubmitting}
            title="Voice input"
            onClick={() => {
              alert('Voice input coming soon!');
            }}
          >
            <Mic size={18} />
          </button>

          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting || disabled}
            className="send-button-compact"
            title="Send message (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
