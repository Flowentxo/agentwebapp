/**
 * Artifact Service
 *
 * Saves agent-generated files (XLSX, PDF, SVG, etc.) to the public directory
 * for static serving by Next.js.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ArtifactResult {
  url: string;
  path: string;
  size: number;
}

class ArtifactService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'public', 'artifacts');
  }

  async saveArtifact(
    agentId: string,
    filename: string,
    content: Buffer | string
  ): Promise<ArtifactResult> {
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(this.baseDir, agentId, dateDir);

    fs.mkdirSync(dir, { recursive: true });

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(dir, safeName);

    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    fs.writeFileSync(filePath, buffer);

    const url = `/artifacts/${agentId}/${dateDir}/${safeName}`;

    return {
      url,
      path: filePath,
      size: buffer.length,
    };
  }
}

export const artifactService = new ArtifactService();
