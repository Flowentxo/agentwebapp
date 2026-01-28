#!/usr/bin/env node

// Production start script for Cloud Run
// Runs only the backend server which serves both API and Next.js frontend

const { spawn } = require('child_process');

console.log('🚀 Starting SINTRA.AI in Production Mode...');
console.log(`📍 Port: ${process.env.PORT || 4000}`);

// Start backend server only (it will serve the Next.js app)
const backend = spawn('node', ['server/index.js'], {
    stdio: 'inherit',
    env: { ...process.env }
});

backend.on('error', (error) => {
    console.error('❌ Backend server error:', error);
    process.exit(1);
});

backend.on('exit', (code) => {
    console.log(`Backend server exited with code ${code}`);
    process.exit(code || 0);
});

// Handle termination signals
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    backend.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    backend.kill('SIGINT');
});
