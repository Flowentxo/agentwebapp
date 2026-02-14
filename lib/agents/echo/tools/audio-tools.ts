/**
 * Echo Audio Tools
 *
 * Voice & audio tools: transcription via OpenAI Whisper, text-to-speech via OpenAI TTS.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── transcribe_audio ────────────────────────────────────────────

export interface TranscribeAudioInput {
  file_id: string;
  language?: string;
}

export interface TranscriptionResult {
  file_id: string;
  language: string;
  duration_seconds: number;
  segments: Array<{
    start: string;
    end: string;
    speaker: string;
    text: string;
    confidence: number;
  }>;
  full_text: string;
  word_count: number;
  speakers_detected: number;
  source: 'whisper_api' | 'mock';
}

export const TRANSCRIBE_AUDIO_TOOL = {
  name: 'transcribe_audio',
  description: 'Transkribiere eine Audiodatei mit OpenAI Whisper. Gibt Timestamps und den vollstaendigen Text zurueck. Falls keine echte Datei vorhanden, wird eine Demo-Transkription generiert.',
  input_schema: {
    type: 'object',
    properties: {
      file_id: {
        type: 'string',
        description: 'Dateipfad oder ID der Audiodatei',
      },
      language: {
        type: 'string',
        description: 'Sprache der Aufnahme (z.B. "de", "en"). Default: "de"',
      },
    },
    required: ['file_id'],
  },
};

/**
 * Try to resolve the file_id to an actual file path
 */
function resolveAudioFile(fileId: string): string | null {
  // Direct path
  if (fs.existsSync(fileId)) return fileId;

  // Check common upload directories
  const uploadDirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
    path.join(process.cwd(), 'tmp'),
    os.tmpdir(),
  ];

  for (const dir of uploadDirs) {
    const candidate = path.join(dir, fileId);
    if (fs.existsSync(candidate)) return candidate;
    // Try with common audio extensions
    for (const ext of ['.mp3', '.wav', '.m4a', '.ogg', '.webm', '.mp4']) {
      if (fs.existsSync(candidate + ext)) return candidate + ext;
    }
  }

  return null;
}

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscriptionResult> {
  const { file_id, language = 'de' } = input;

  const filePath = resolveAudioFile(file_id);

  // If we have a real file and an API key, use Whisper
  if (filePath && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(filePath),
        language,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      const whisperSegments = (response as any).segments || [];
      const segments = whisperSegments.map((seg: any, idx: number) => ({
        start: formatTime(seg.start || 0),
        end: formatTime(seg.end || 0),
        speaker: `Sprecher ${(idx % 3) + 1}`, // Whisper doesn't do speaker diarization
        text: seg.text?.trim() || '',
        confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.95,
      }));

      const fullText = segments.map((s: any) => `[${s.speaker}] ${s.text}`).join('\n');
      const speakers = new Set(segments.map((s: any) => s.speaker));

      return {
        file_id,
        language,
        duration_seconds: Math.round((response as any).duration || 0),
        segments,
        full_text: fullText,
        word_count: fullText.split(/\s+/).length,
        speakers_detected: speakers.size,
        source: 'whisper_api',
      };
    } catch (error: any) {
      console.error('[ECHO] Whisper API failed, falling back to mock:', error.message);
    }
  }

  // Fallback: mock transcription
  return generateMockTranscription(file_id, language);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateMockTranscription(fileId: string, language: string): TranscriptionResult {
  const mockSegments = language === 'en' ? MOCK_SEGMENTS_EN : MOCK_SEGMENTS_DE;
  const segmentDuration = 8;
  let currentTime = 0;

  const segments = mockSegments.map((seg) => {
    const start = formatTime(currentTime);
    currentTime += segmentDuration + Math.floor(Math.random() * 4);
    const end = formatTime(currentTime);

    return {
      start,
      end,
      speaker: seg.speaker,
      text: seg.text,
      confidence: 0.92 + Math.random() * 0.07,
    };
  });

  const fullText = segments.map(s => `[${s.speaker}] ${s.text}`).join('\n');
  const speakers = new Set(segments.map(s => s.speaker));

  return {
    file_id: fileId,
    language,
    duration_seconds: currentTime,
    segments,
    full_text: fullText,
    word_count: fullText.split(/\s+/).length,
    speakers_detected: speakers.size,
    source: 'mock',
  };
}

const MOCK_SEGMENTS_DE = [
  { speaker: 'Sprecher 1', text: 'Willkommen zum heutigen Meeting. Lassen Sie uns mit dem Status-Update beginnen.' },
  { speaker: 'Sprecher 2', text: 'Danke. Wir haben diese Woche drei wichtige Meilensteine erreicht.' },
  { speaker: 'Sprecher 2', text: 'Erstens ist die neue API-Integration live. Zweitens haben wir die Performance um 40 Prozent verbessert.' },
  { speaker: 'Sprecher 1', text: 'Das klingt hervorragend. Was war der dritte Meilenstein?' },
  { speaker: 'Sprecher 2', text: 'Drittens haben wir das Onboarding komplett ueberarbeitet. Die Conversion-Rate ist um 25 Prozent gestiegen.' },
  { speaker: 'Sprecher 3', text: 'Aus Marketing-Sicht koennen wir das gut fuer die naechste Kampagne nutzen.' },
  { speaker: 'Sprecher 1', text: 'Sehr gut. Lassen Sie uns die naechsten Schritte besprechen und die Aufgaben verteilen.' },
];

const MOCK_SEGMENTS_EN = [
  { speaker: 'Speaker 1', text: 'Welcome to today\'s meeting. Let\'s start with the status update.' },
  { speaker: 'Speaker 2', text: 'Thanks. We hit three major milestones this week.' },
  { speaker: 'Speaker 2', text: 'First, the new API integration is live. Second, we improved performance by 40 percent.' },
  { speaker: 'Speaker 1', text: 'That sounds great. What was the third milestone?' },
  { speaker: 'Speaker 2', text: 'Third, we completely revamped onboarding. Conversion rate is up 25 percent.' },
];

// ─── generate_tts_preview ────────────────────────────────────────

export interface GenerateTtsInput {
  text: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed?: number;
}

export interface TtsPreviewResult {
  text: string;
  voice: string;
  speed: number;
  audio_file?: string;
  duration_estimate_seconds: number;
  format: string;
  character_count: number;
  cost_estimate: string;
  source: 'tts_api' | 'mock';
}

export const GENERATE_TTS_PREVIEW_TOOL = {
  name: 'generate_tts_preview',
  description: 'Erstelle eine Text-to-Speech Vorschau mit OpenAI TTS. Generiert eine MP3-Datei mit der gewaehlten Stimme und Geschwindigkeit.',
  input_schema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Der zu sprechende Text',
      },
      voice: {
        type: 'string',
        enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        description: 'Stimme (default: "nova")',
      },
      speed: {
        type: 'number',
        description: 'Sprechgeschwindigkeit 0.25 bis 4.0 (default: 1.0)',
      },
    },
    required: ['text'],
  },
};

export async function generateTtsPreview(input: GenerateTtsInput): Promise<TtsPreviewResult> {
  const { text, voice = 'nova', speed = 1.0 } = input;

  // Duration/cost estimates
  const wordCount = text.split(/\s+/).length;
  const durationSeconds = Math.round((wordCount / 150) * 60 / speed);
  const costEstimate = `~$${((text.length / 1000) * 0.015).toFixed(4)}`;

  // Try real OpenAI TTS if API key available
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const ttsResponse = await openai.audio.speech.create({
        model: 'tts-1',
        voice: voice as any,
        input: text,
        speed,
        response_format: 'mp3',
      });

      // Save to temp file
      const outputDir = path.join(process.cwd(), 'tmp', 'tts');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `tts-${Date.now().toString(36)}-${voice}.mp3`;
      const outputPath = path.join(outputDir, filename);

      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      fs.writeFileSync(outputPath, buffer);

      return {
        text,
        voice,
        speed,
        audio_file: outputPath,
        duration_estimate_seconds: durationSeconds,
        format: 'mp3',
        character_count: text.length,
        cost_estimate: costEstimate,
        source: 'tts_api',
      };
    } catch (error: any) {
      console.error('[ECHO] TTS API failed, falling back to mock:', error.message);
    }
  }

  // Fallback: mock response
  return {
    text,
    voice,
    speed,
    duration_estimate_seconds: durationSeconds,
    format: 'mp3',
    character_count: text.length,
    cost_estimate: costEstimate,
    source: 'mock',
  };
}
