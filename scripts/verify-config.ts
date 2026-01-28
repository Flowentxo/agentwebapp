import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { OpenAI } from 'openai';
import { Client } from 'pg';
import { createClient } from 'redis';
import { MongoClient } from 'mongodb';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import fs from 'fs';

async function verifySystem() {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(msg);
    };

    log('🔍 Starting System Verification...\n');

    // 1. Environment Check
    log('1️⃣  Environment Configuration');
    log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
    log(`   - API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    log(`   - DB URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
    log(`   - Redis URL: ${process.env.REDIS_URL ? '✅ Set' : '❌ Missing'}`);
    log(`   - Mongo URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Missing'}`);
    log(`   - MinIO Endpoint: ${process.env.AWS_ENDPOINT || '❌ Missing'}`);
    log(`   - OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    log(`   - OpenAI Base URL: ${process.env.OPENAI_BASE_URL || 'Default (https://api.openai.com/v1)'}`);

    // 2. Postgres Check
    log('\n2️⃣  PostgreSQL Connection');
    try {
        const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
        await pgClient.connect();
        const pgRes = await pgClient.query('SELECT NOW()');
        log(`   ✅ Connected! Time: ${pgRes.rows[0].now}`);
        await pgClient.end();
    } catch (err: any) {
        log(`   ❌ Failed: ${err.message}`);
    }

    // 3. Redis Check
    log('\n3️⃣  Redis Connection');
    try {
        const redisClient = createClient({ url: process.env.REDIS_URL });
        await redisClient.connect();
        const pong = await redisClient.ping();
        log(`   ✅ Connected! Response: ${pong}`);
        await redisClient.disconnect();
    } catch (err: any) {
        log(`   ❌ Failed: ${err.message}`);
    }

    // 4. MongoDB Check
    log('\n4️⃣  MongoDB Connection');
    try {
        const mongoClient = new MongoClient(process.env.MONGODB_URI!);
        await mongoClient.connect();
        await mongoClient.db('admin').command({ ping: 1 });
        log('   ✅ Connected!');
        await mongoClient.close();
    } catch (err: any) {
        log(`   ❌ Failed: ${err.message}`);
    }

    // 5. MinIO Check
    log('\n5️⃣  MinIO (Storage) Connection');
    try {
        const s3 = new S3Client({
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
            forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === 'true',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });
        const buckets = await s3.send(new ListBucketsCommand({}));
        log(`   ✅ Connected! Buckets: ${buckets.Buckets?.map(b => b.Name).join(', ')}`);
    } catch (err: any) {
        log(`   ❌ Failed: ${err.message}`);
    }

    // 6. AI Service Check
    log('\n6️⃣  AI Service Configuration');
    try {
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL,
        });

        // Only test if we have a key or local URL
        if (process.env.OPENAI_API_KEY === 'sk-placeholder-offline-mode' && !process.env.OPENAI_BASE_URL) {
            log('   ⚠️  Offline Mode detected (Placeholder Key). AI calls will fail unless LocalAI/Ollama is running.');
        } else {
            log('   🔄 Testing AI connection (listing models)...');
            try {
                const models = await openai.models.list();
                log(`   ✅ AI Service Reachable! Found ${models.data.length} models.`);
            } catch (e: any) {
                log(`   ⚠️  AI Connection Failed: ${e.message}`);
                if (e.code === 'ECONNREFUSED') {
                    log('       (If using Ollama, make sure it is running at port 11434)');
                }
            }
        }
    } catch (err: any) {
        log(`   ❌ Config Error: ${err.message}`);
    }

    log('\n🏁 Verification Complete');
    fs.writeFileSync('verify_output.txt', logs.join('\n'), 'utf-8');
}

verifySystem();
