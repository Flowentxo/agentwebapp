/**
 * Brain AI - k6 Load Testing Scenarios
 *
 * Tests application performance under various load conditions
 *
 * Usage:
 *   k6 run tests/performance/k6-load-test.js
 *   k6 run --vus 100 --duration 5m tests/performance/k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryDuration = new Trend('brain_query_duration');
const cacheHitRate = new Rate('cache_hits');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 10 },
    // Ramp-up to normal load
    { duration: '1m', target: 50 },
    // Sustained normal load
    { duration: '3m', target: 50 },
    // Ramp-up to peak load
    { duration: '1m', target: 100 },
    // Peak load
    { duration: '2m', target: 100 },
    // Spike test
    { duration: '30s', target: 200 },
    // Cool-down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<2000', 'p(99)<3000'], // 95% under 2s, 99% under 3s

    // Error rate
    'errors': ['rate<0.05'], // Error rate < 5%

    // Request success rate
    'http_req_failed': ['rate<0.05'],

    // Brain query duration
    'brain_query_duration': ['p(95)<2500'],

    // Cache hit rate
    'cache_hits': ['rate>0.50'], // Cache hit rate > 50%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Sample test data
const sampleQueries = [
  'What are the latest sales trends?',
  'How can I improve customer satisfaction?',
  'Analyze our Q4 performance',
  'What are the top customer complaints?',
  'Show me the revenue breakdown by region',
  'How is our cache performance?',
  'What are the most active agents?',
  'Explain the deployment architecture',
  'How do I troubleshoot database issues?',
  'What are the security best practices?',
];

const sampleDocuments = [
  {
    title: 'Q4 Sales Report',
    content: 'Sales increased by 25% in Q4 compared to Q3...',
    tags: ['sales', 'report', 'q4'],
  },
  {
    title: 'Customer Feedback Analysis',
    content: 'Customer satisfaction scores improved to 4.5/5...',
    tags: ['customer', 'feedback', 'satisfaction'],
  },
  {
    title: 'Performance Optimization Guide',
    content: 'Best practices for optimizing Brain AI performance...',
    tags: ['performance', 'optimization', 'guide'],
  },
];

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getUserId() {
  return `load-test-user-${__VU}`;
}

// Test scenarios
export default function () {
  const userId = getUserId();
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': userId,
  };

  // Scenario 1: Health Check (20% of requests)
  if (Math.random() < 0.2) {
    group('Health Check', () => {
      const res = http.get(`${BASE_URL}/api/brain/health`);

      check(res, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 500ms': (r) => r.timings.duration < 500,
        'has database status': (r) => r.json('services.postgresql') !== undefined,
        'has redis status': (r) => r.json('services.redis') !== undefined,
      });

      errorRate.add(res.status !== 200);
    });
  }

  // Scenario 2: Brain Query (50% of requests)
  if (Math.random() < 0.5) {
    group('Brain Query', () => {
      const query = randomChoice(sampleQueries);
      const payload = JSON.stringify({
        query: query,
        limit: 5,
        threshold: 0.7,
      });

      const startTime = new Date();
      const res = http.post(
        `${BASE_URL}/api/brain/query`,
        payload,
        { headers }
      );
      const duration = new Date() - startTime;

      check(res, {
        'query status is 200': (r) => r.status === 200,
        'query has results': (r) => {
          try {
            const body = r.json();
            return body.results !== undefined;
          } catch (e) {
            return false;
          }
        },
        'query response time < 3s': (r) => r.timings.duration < 3000,
      });

      queryDuration.add(duration);
      errorRate.add(res.status !== 200);

      if (res.status !== 200) {
        failedRequests.add(1);
      }

      // Check if request was served from cache
      const cacheHeader = res.headers['X-Cache-Status'];
      cacheHitRate.add(cacheHeader === 'HIT');
    });
  }

  // Scenario 3: Document Ingest (10% of requests)
  if (Math.random() < 0.1) {
    group('Document Ingest', () => {
      const doc = randomChoice(sampleDocuments);
      const payload = JSON.stringify({
        title: `${doc.title} - ${Date.now()}`,
        content: doc.content,
        tags: doc.tags,
        metadata: {
          source: 'k6-load-test',
          userId: userId,
        },
      });

      const res = http.post(
        `${BASE_URL}/api/brain/ingest`,
        payload,
        { headers }
      );

      check(res, {
        'ingest status is 201': (r) => r.status === 201,
        'ingest has documentId': (r) => {
          try {
            return r.json('documentId') !== undefined;
          } catch (e) {
            return false;
          }
        },
        'ingest response time < 5s': (r) => r.timings.duration < 5000,
      });

      errorRate.add(res.status !== 201);
    });
  }

  // Scenario 4: Metrics Endpoint (10% of requests)
  if (Math.random() < 0.1) {
    group('Metrics Check', () => {
      const res = http.get(`${BASE_URL}/api/brain/metrics`);

      check(res, {
        'metrics status is 200': (r) => r.status === 200,
        'has query metrics': (r) => {
          try {
            return r.json('totalQueries') !== undefined;
          } catch (e) {
            return false;
          }
        },
        'metrics response time < 1s': (r) => r.timings.duration < 1000,
      });

      errorRate.add(res.status !== 200);
    });
  }

  // Scenario 5: Agent Chat (10% of requests)
  if (Math.random() < 0.1) {
    group('Agent Chat', () => {
      const agents = ['dexter', 'cassie', 'emmie', 'aura', 'kai'];
      const agentId = randomChoice(agents);
      const message = randomChoice(sampleQueries);

      const payload = JSON.stringify({
        content: message,
      });

      const res = http.post(
        `${BASE_URL}/api/agents/${agentId}/chat`,
        payload,
        { headers }
      );

      check(res, {
        'chat request accepted': (r) => r.status === 200 || r.status === 201,
        'chat response time < 5s': (r) => r.timings.duration < 5000,
      });

      errorRate.add(res.status >= 400);
    });
  }

  // Think time between requests (simulate real user behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total VUs: ${options.stages.reduce((max, stage) => Math.max(max, stage.target), 0)}`);
}
