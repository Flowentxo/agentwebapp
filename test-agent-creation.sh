#!/bin/bash

echo "🔍 Testing Agent Creation API..."
echo

# Test with proper JSON escaping
curl -X POST http://localhost:3000/api/agents/create \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a customer support agent"}' \
  -v

echo
echo "Test completed."