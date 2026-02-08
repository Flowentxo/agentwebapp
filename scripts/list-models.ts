/**
 * OpenAI Model Discovery Script
 *
 * Lists all GPT models available for your API key.
 * Run with: npx tsx scripts/list-models.ts
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('\n❌ ERROR: OPENAI_API_KEY not found in .env.local\n');
  process.exit(1);
}

console.log('\n🔍 Connecting to OpenAI API...');
console.log(`   API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}\n`);

const openai = new OpenAI({ apiKey });

async function main() {
  try {
    const models = await openai.models.list();

    // Filter and sort GPT models
    const gptModels = models.data
      .filter(m => m.id.includes('gpt'))
      .sort((a, b) => a.id.localeCompare(b.id));

    // Separate by type
    const gpt5Models = gptModels.filter(m => m.id.includes('gpt-5'));
    const gpt4oModels = gptModels.filter(m => m.id.includes('gpt-4o'));
    const gpt4Models = gptModels.filter(m => m.id.includes('gpt-4') && !m.id.includes('gpt-4o'));
    const gpt35Models = gptModels.filter(m => m.id.includes('gpt-3.5'));
    const otherGpt = gptModels.filter(m =>
      !m.id.includes('gpt-5') &&
      !m.id.includes('gpt-4') &&
      !m.id.includes('gpt-3.5')
    );

    console.log('═══════════════════════════════════════════════════════════');
    console.log('                 AVAILABLE GPT MODELS                       ');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (gpt5Models.length > 0) {
      console.log('🆕 GPT-5 Models (Latest):');
      gpt5Models.forEach(m => console.log(`   ✅ ${m.id}`));
      console.log('');
    } else {
      console.log('🆕 GPT-5 Models: ❌ NONE AVAILABLE');
      console.log('   (GPT-5 has not been released yet)\n');
    }

    if (gpt4oModels.length > 0) {
      console.log('🚀 GPT-4o Models (Recommended):');
      gpt4oModels.forEach(m => console.log(`   ✅ ${m.id}`));
      console.log('');
    }

    if (gpt4Models.length > 0) {
      console.log('💪 GPT-4 Models:');
      gpt4Models.forEach(m => console.log(`   ✅ ${m.id}`));
      console.log('');
    }

    if (gpt35Models.length > 0) {
      console.log('📦 GPT-3.5 Models (Legacy):');
      gpt35Models.forEach(m => console.log(`   ⚠️  ${m.id}`));
      console.log('');
    }

    if (otherGpt.length > 0) {
      console.log('📋 Other GPT Models:');
      otherGpt.forEach(m => console.log(`   • ${m.id}`));
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total GPT Models Available: ${gptModels.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Recommendation
    if (gpt4oModels.some(m => m.id === 'gpt-4o-mini')) {
      console.log('💡 RECOMMENDATION: Use "gpt-4o-mini"');
      console.log('   - Best cost/performance ratio');
      console.log('   - $0.15 / 1M input tokens');
      console.log('   - Supports vision, streaming, function calling\n');
    } else if (gpt4oModels.some(m => m.id === 'gpt-4o')) {
      console.log('💡 RECOMMENDATION: Use "gpt-4o"');
      console.log('   - Most capable model');
      console.log('   - $5 / 1M input tokens\n');
    }

  } catch (error: any) {
    if (error.status === 401) {
      console.error('❌ Authentication Error: Invalid API key');
      console.error('   Please check your OPENAI_API_KEY in .env.local\n');
    } else {
      console.error('❌ Error:', error.message || error);
    }
    process.exit(1);
  }
}

main();
