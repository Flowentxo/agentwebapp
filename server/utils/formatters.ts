import { logger } from './logger';

export interface FormatterOptions {
  format: 'json' | 'html' | 'pdf' | 'text';
  data: any;
  title?: string;
  metadata?: Record<string, any>;
}

export interface FormattedOutput {
  format: string;
  content: string | Buffer;
  contentType: string;
  filename?: string;
}

/**
 * Output-Formatter für CrewAI-Ergebnisse
 */
export class OutputFormatter {
  /**
   * Formatiert Daten basierend auf dem gewünschten Format
   */
  static format(options: FormatterOptions): FormattedOutput {
    const { format, data, title, metadata } = options;

    switch (format) {
      case 'json':
        return this.formatJSON(data, metadata);

      case 'html':
        return this.formatHTML(data, title, metadata);

      case 'pdf':
        return this.formatPDFPlaceholder(data, title, metadata);

      case 'text':
        return this.formatText(data);

      default:
        logger.warn(`Unknown format: ${format}, defaulting to JSON`);
        return this.formatJSON(data, metadata);
    }
  }

  /**
   * JSON-Formatierung
   */
  private static formatJSON(data: any, metadata?: Record<string, any>): FormattedOutput {
    const output = {
      timestamp: new Date().toISOString(),
      data,
      metadata: metadata || {}
    };

    return {
      format: 'json',
      content: JSON.stringify(output, null, 2),
      contentType: 'application/json',
      filename: `output_${Date.now()}.json`
    };
  }

  /**
   * HTML-Formatierung
   */
  private static formatHTML(data: any, title?: string, metadata?: Record<string, any>): FormattedOutput {
    const htmlTitle = title || 'CrewAI Automation Report';
    const timestamp = new Date().toISOString();

    let html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${htmlTitle}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 40px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        .metadata {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .metadata-item {
            margin: 8px 0;
        }
        .metadata-label {
            font-weight: bold;
            color: #34495e;
        }
        .content {
            margin-top: 30px;
        }
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre-wrap;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
            margin-top: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${htmlTitle}</h1>

        ${metadata ? `
        <div class="metadata">
            <h3>Metadata</h3>
            ${Object.entries(metadata).map(([key, value]) => `
            <div class="metadata-item">
                <span class="metadata-label">${key}:</span> ${value}
            </div>
            `).join('')}
        </div>
        ` : ''}

        <div class="content">
            <h3>Output Data</h3>
            ${this.dataToHTML(data)}
        </div>

        <div class="timestamp">
            Generated: ${timestamp}
        </div>
    </div>
</body>
</html>
    `;

    return {
      format: 'html',
      content: html,
      contentType: 'text/html',
      filename: `report_${Date.now()}.html`
    };
  }

  /**
   * Konvertiert Daten zu HTML-Darstellung
   */
  private static dataToHTML(data: any): string {
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // Array als Tabelle darstellen
        if (data.length === 0) return '<p>No data available</p>';

        if (typeof data[0] === 'object') {
          const keys = Object.keys(data[0]);
          return `
            <table>
              <thead>
                <tr>${keys.map(key => `<th>${key}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${data.map(item => `
                  <tr>${keys.map(key => `<td>${item[key]}</td>`).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
          `;
        } else {
          return `<ul>${data.map(item => `<li>${item}</li>`).join('')}</ul>`;
        }
      } else {
        // Objekt als formatted JSON
        return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
      }
    } else {
      return `<p>${String(data)}</p>`;
    }
  }

  /**
   * PDF-Formatierung (Placeholder - benötigt pdf-lib oder ähnliches)
   * In Produktion: PDF-Bibliothek wie 'pdf-lib' oder 'pdfkit' verwenden
   */
  private static formatPDFPlaceholder(data: any, title?: string, metadata?: Record<string, any>): FormattedOutput {
    logger.warn('PDF generation placeholder - implement with pdf-lib or pdfkit');

    // Für Produktivbetrieb: Implementierung mit PDF-Bibliothek
    // Aktuell: Rückgabe als HTML mit PDF-Hinweis
    const htmlOutput = this.formatHTML(data, title, metadata);

    return {
      format: 'pdf',
      content: `PDF Generation Placeholder:\n\n${htmlOutput.content}\n\n[Install 'pdfkit' or 'pdf-lib' for actual PDF generation]`,
      contentType: 'application/pdf',
      filename: `report_${Date.now()}.pdf`
    };
  }

  /**
   * Text-Formatierung
   */
  private static formatText(data: any): FormattedOutput {
    let text: string;

    if (typeof data === 'object') {
      text = JSON.stringify(data, null, 2);
    } else {
      text = String(data);
    }

    return {
      format: 'text',
      content: text,
      contentType: 'text/plain',
      filename: `output_${Date.now()}.txt`
    };
  }

  /**
   * Formatiert CrewAI-Response für Weboberfläche
   */
  static formatForWebApp(crewAIResponse: any, requestedFormat: 'json' | 'html' | 'pdf' = 'json'): FormattedOutput {
    return this.format({
      format: requestedFormat,
      data: crewAIResponse.outputs || crewAIResponse,
      title: `CrewAI ${crewAIResponse.workflow || 'Automation'} Result`,
      metadata: {
        workflow: crewAIResponse.workflow,
        status: crewAIResponse.status,
        kick_id: crewAIResponse.kick_id,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Formatiert Fehler-Response
   */
  static formatError(error: Error | string, workflow?: string): FormattedOutput {
    const errorData = {
      error: true,
      message: typeof error === 'string' ? error : error.message,
      workflow: workflow || 'unknown',
      timestamp: new Date().toISOString()
    };

    return this.formatJSON(errorData, { type: 'error' });
  }
}

/**
 * Hilfsfunktionen für schnellen Zugriff
 */
export const formatJSON = (data: any, metadata?: Record<string, any>) =>
  OutputFormatter.format({ format: 'json', data, metadata });

export const formatHTML = (data: any, title?: string, metadata?: Record<string, any>) =>
  OutputFormatter.format({ format: 'html', data, title, metadata });

export const formatPDF = (data: any, title?: string, metadata?: Record<string, any>) =>
  OutputFormatter.format({ format: 'pdf', data, title, metadata });

export const formatText = (data: any) =>
  OutputFormatter.format({ format: 'text', data });
