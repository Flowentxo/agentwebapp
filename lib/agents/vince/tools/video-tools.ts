/**
 * Vince Video Tools
 *
 * Video production tools: script writing, storyboard creation.
 */

// ─── write_script ────────────────────────────────────────────────

export interface WriteScriptInput {
  topic: string;
  duration_seconds: number;
}

export interface ScriptResult {
  topic: string;
  total_duration_seconds: number;
  scenes: Array<{
    timecode: string;
    duration_seconds: number;
    visual: string;
    audio_voiceover: string;
    notes: string;
  }>;
  markdown_script: string;
  download_url?: string;
}

export const WRITE_SCRIPT_TOOL = {
  name: 'write_script',
  description: 'Schreibe ein Video-Skript mit Timecodes, Visuellen Anweisungen und Voiceover-Text fuer eine bestimmte Dauer.',
  input_schema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Das Thema oder der Titel des Videos',
      },
      duration_seconds: {
        type: 'number',
        description: 'Gewuenschte Gesamtdauer in Sekunden (z.B. 60 fuer 1 Minute)',
      },
    },
    required: ['topic', 'duration_seconds'],
  },
};

export async function writeScript(input: WriteScriptInput): Promise<ScriptResult> {
  const { topic, duration_seconds } = input;

  const sceneCount = Math.max(3, Math.min(8, Math.ceil(duration_seconds / 10)));
  const sceneDuration = Math.floor(duration_seconds / sceneCount);
  const scenes: ScriptResult['scenes'] = [];

  const sceneTemplates = [
    { visual: 'Intro-Animation mit Logo und Titel-Einblendung', audio: `Willkommen! Heute sprechen wir ueber ${topic}.`, notes: 'Dynamische Intro-Animation, Branding-Farben' },
    { visual: 'Problemdarstellung mit animierten Icons', audio: `Viele Unternehmen stehen vor der Herausforderung, ${topic} effektiv umzusetzen.`, notes: 'Rote/orange Farbtoene fuer Problem-Visualisierung' },
    { visual: 'Statistik-Grafik mit Key-Numbers', audio: `Studien zeigen: 78% der Firmen, die ${topic} implementieren, sehen messbare Ergebnisse.`, notes: 'Animierte Zahlen, Data-Visualization' },
    { visual: 'Loesung wird vorgestellt, Split-Screen Vorher/Nachher', audio: `Hier kommt die Loesung: Mit dem richtigen Ansatz wird ${topic} zum Wettbewerbsvorteil.`, notes: 'Gruene Farbtoene, positive Stimmung' },
    { visual: 'Feature-Showcase mit Screen-Recording', audio: `Schauen wir uns an, wie das konkret aussieht. In drei einfachen Schritten...`, notes: 'Clean UI, Step-by-Step Nummerierung' },
    { visual: 'Kundentestimonial oder Zitat-Einblendung', audio: `Unsere Kunden berichten von beeindruckenden Ergebnissen nach der Implementierung.`, notes: 'Authentisches Foto, Zitat als Text-Overlay' },
    { visual: 'Zusammenfassung mit 3 Key-Takeaways', audio: `Fassen wir zusammen: Erstens... Zweitens... Drittens...`, notes: 'Bullet Points animiert einblenden' },
    { visual: 'Outro mit Call-to-Action und Kontaktdaten', audio: `Bereit fuer den naechsten Schritt? Klicke jetzt auf den Link und starte heute noch.`, notes: 'CTA-Button Animation, Social Media Icons' },
  ];

  let currentTime = 0;
  for (let i = 0; i < sceneCount; i++) {
    const template = sceneTemplates[i % sceneTemplates.length];
    const startMin = Math.floor(currentTime / 60);
    const startSec = currentTime % 60;
    const endTime = currentTime + sceneDuration;
    const endMin = Math.floor(endTime / 60);
    const endSec = endTime % 60;

    scenes.push({
      timecode: `${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')} - ${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')}`,
      duration_seconds: sceneDuration,
      visual: template.visual,
      audio_voiceover: template.audio,
      notes: template.notes,
    });

    currentTime = endTime;
  }

  const markdownLines = [
    `# Video-Skript: ${topic}`,
    `**Gesamtdauer:** ${duration_seconds}s | **Szenen:** ${sceneCount}`,
    '',
    `| Timecode | Visual | Voiceover | Notizen |`,
    `|----------|--------|-----------|---------|`,
    ...scenes.map(s => `| ${s.timecode} | ${s.visual} | ${s.audio_voiceover} | ${s.notes} |`),
  ];

  // Generate PDF artifact
  let download_url: string | undefined;
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const { artifactService } = await import('@/server/services/ArtifactService');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfDone = new Promise<void>((resolve) => doc.on('end', resolve));

    // Title page
    doc.fontSize(24).font('Helvetica-Bold').text(`Video-Skript: ${topic}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).font('Helvetica').text(`Gesamtdauer: ${duration_seconds}s | Szenen: ${scenes.length}`, { align: 'center' });
    doc.moveDown(2);

    // Scenes
    for (const scene of scenes) {
      doc.fontSize(12).font('Helvetica-Bold').text(scene.timecode);
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold').text('VISUAL: ', { continued: true }).font('Helvetica').text(scene.visual);
      doc.fontSize(10).font('Helvetica-Bold').text('VOICEOVER: ', { continued: true }).font('Helvetica').text(scene.audio_voiceover);
      doc.fontSize(9).font('Helvetica-Oblique').text(`Notizen: ${scene.notes}`);
      doc.moveDown(0.8);
    }

    doc.end();
    await pdfDone;
    const pdfBuffer = Buffer.concat(chunks);

    const safeName = `skript-${topic.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}-${duration_seconds}s.pdf`;
    const artifact = await artifactService.saveArtifact('vince', safeName, pdfBuffer);
    download_url = artifact.url;
  } catch (err) {
    console.error('[VINCE] PDF artifact generation failed (non-fatal):', err);
  }

  return {
    topic,
    total_duration_seconds: duration_seconds,
    scenes,
    markdown_script: markdownLines.join('\n'),
    download_url,
  };
}

// ─── create_storyboard ───────────────────────────────────────────

export interface CreateStoryboardInput {
  scenes: string[];
}

export interface StoryboardResult {
  total_scenes: number;
  storyboard: Array<{
    scene_number: number;
    description: string;
    image_description: string;
    camera_angle: string;
    duration: string;
    transition: string;
  }>;
  markdown_storyboard: string;
}

export const CREATE_STORYBOARD_TOOL = {
  name: 'create_storyboard',
  description: 'Erstelle ein Storyboard aus Szenenbeschreibungen. Generiert pro Szene: Bildbeschreibung, Kameraeinstellung, Dauer und Uebergang.',
  input_schema: {
    type: 'object',
    properties: {
      scenes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Liste von Szenenbeschreibungen',
      },
    },
    required: ['scenes'],
  },
};

const CAMERA_ANGLES = ['Totale (Wide Shot)', 'Halbtotale (Medium Shot)', 'Nahaufnahme (Close-Up)', 'Detail (Extreme Close-Up)', 'Vogelperspektive (Bird\'s Eye)', 'Untersicht (Low Angle)', 'Schulterperspektive (Over the Shoulder)'];
const TRANSITIONS = ['Schnitt (Cut)', 'Ueberblendung (Dissolve)', 'Wischblende (Wipe)', 'Zoom-Uebergang', 'Fade to Black', 'Match Cut', 'Slide Transition'];

export async function createStoryboard(input: CreateStoryboardInput): Promise<StoryboardResult> {
  const { scenes } = input;

  const storyboard = scenes.map((scene, idx) => ({
    scene_number: idx + 1,
    description: scene,
    image_description: `Szene ${idx + 1}: ${scene}. Professionelle Beleuchtung, moderne Farbpalette, 16:9 Format.`,
    camera_angle: CAMERA_ANGLES[idx % CAMERA_ANGLES.length],
    duration: `${3 + Math.floor(Math.random() * 5)}s`,
    transition: idx < scenes.length - 1 ? TRANSITIONS[idx % TRANSITIONS.length] : 'Fade to Black',
  }));

  const markdownLines = [
    `# Storyboard (${scenes.length} Szenen)`,
    '',
    ...storyboard.map(s => [
      `## Szene ${s.scene_number}`,
      `- **Beschreibung:** ${s.description}`,
      `- **Bild:** ${s.image_description}`,
      `- **Kamera:** ${s.camera_angle}`,
      `- **Dauer:** ${s.duration}`,
      `- **Uebergang:** ${s.transition}`,
      '',
    ].join('\n')),
  ];

  return {
    total_scenes: scenes.length,
    storyboard,
    markdown_storyboard: markdownLines.join('\n'),
  };
}
