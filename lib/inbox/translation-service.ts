import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

/**
 * Detect language of text
 */
export async function detectLanguage(text: string): Promise<{
  language: string;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the given text. Return JSON with: language (ISO 639-1 code), confidence (0-1)'
        },
        {
          role: 'user',
          content: `Detect language: "${text}"`
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return {
      language: result.language || 'en',
      confidence: result.confidence || 0.5
    };
  } catch (error) {
    console.error('[DETECT_LANGUAGE] Error:', error);
    return { language: 'en', confidence: 0 };
  }
}

/**
 * Translate text to target language
 */
export async function translateText(
  text: string,
  targetLanguage: string = 'en',
  sourceLanguage?: string
): Promise<TranslationResult> {
  try {
    // Detect source language if not provided
    if (!sourceLanguage) {
      const detected = await detectLanguage(text);
      sourceLanguage = detected.language;
    }

    // Skip translation if already in target language
    if (sourceLanguage === targetLanguage) {
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        confidence: 1
      };
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the text to ${targetLanguage}. Preserve tone, style, and meaning. Return only the translation, no explanations.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    });

    const translatedText = response.choices[0].message.content || text;

    return {
      originalText: text,
      translatedText,
      sourceLanguage,
      targetLanguage,
      confidence: 0.9
    };
  } catch (error) {
    console.error('[TRANSLATE_TEXT] Error:', error);
    return {
      originalText: text,
      translatedText: text,
      sourceLanguage: sourceLanguage || 'unknown',
      targetLanguage,
      confidence: 0
    };
  }
}

/**
 * Batch translate multiple texts
 */
export async function batchTranslate(
  texts: string[],
  targetLanguage: string = 'en'
): Promise<TranslationResult[]> {
  try {
    const promises = texts.map(text => translateText(text, targetLanguage));
    return await Promise.all(promises);
  } catch (error) {
    console.error('[BATCH_TRANSLATE] Error:', error);
    return texts.map(text => ({
      originalText: text,
      translatedText: text,
      sourceLanguage: 'unknown',
      targetLanguage,
      confidence: 0
    }));
  }
}
