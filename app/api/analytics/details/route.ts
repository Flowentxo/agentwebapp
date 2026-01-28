import { NextRequest, NextResponse } from 'next/server';

// Mock data generator for different metrics
const generateMockDetails = (metric: string) => {
  switch (metric) {
    case 'agents.active':
      return {
        title: 'Active Agents Details',
        columns: ['Agent Name', 'Type', 'Status', 'Last Active', 'Tasks (24h)'],
        rows: Array.from({ length: 15 }).map((_, i) => ({
          id: i,
          col1: `Agent-${i + 100}`,
          col2: i % 3 === 0 ? 'Scraper' : i % 3 === 1 ? 'Classifier' : 'Responder',
          col3: 'Active',
          col4: `${Math.floor(Math.random() * 59)} mins ago`,
          col5: Math.floor(Math.random() * 500)
        }))
      };
    case 'cost.total':
      return {
        title: 'Cost Breakdown',
        columns: ['Transaction ID', 'Service', 'Model', 'Tokens', 'Cost ($)'],
        rows: Array.from({ length: 15 }).map((_, i) => ({
          id: i,
          col1: `TXN-${Math.random().toString(36).substr(2, 9)}`,
          col2: i % 2 === 0 ? 'OpenAI' : 'Anthropic',
          col3: i % 2 === 0 ? 'gpt-4o' : 'claude-3-5-sonnet',
          col4: Math.floor(Math.random() * 2000),
          col5: (Math.random() * 0.05).toFixed(4)
        }))
      };
    case 'execution.success_rate':
      return {
        title: 'Execution Log (Recent)',
        columns: ['Execution ID', 'Agent', 'Status', 'Duration (ms)', 'Error'],
        rows: Array.from({ length: 15 }).map((_, i) => ({
          id: i,
          col1: `EXEC-${Math.random().toString(36).substr(2, 6)}`,
          col2: `Agent-${Math.floor(Math.random() * 10)}`,
          col3: i < 1 ? 'Failed' : 'Success',
          col4: Math.floor(Math.random() * 5000),
          col5: i < 1 ? 'TimeoutError: 3000ms exceeded' : '-'
        }))
      };
    default:
      return {
        title: 'Data Details',
        columns: ['ID', 'Metric', 'Value', 'Timestamp'],
        rows: []
      };
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get('metric') || '';
  
  // Simulate DB latency
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const data = generateMockDetails(metric);
  
  return NextResponse.json(data);
}
