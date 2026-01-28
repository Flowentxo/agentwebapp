// Dummy data for Agent Revolution UI

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  capabilities: string[];
  useCases: string[];
  tags: string[];
  complexity: 'simple' | 'medium' | 'advanced';
  estimatedTime: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  category: string;
  capabilities: string[];
  kpis: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
  lastActivity: string;
  tags: string[];
}

// Agent Templates
export const agentTemplates: AgentTemplate[] = [
  {
    id: 'customer-support-basic',
    name: 'Customer Support Assistant',
    description: 'Handle customer inquiries, provide support, and resolve common issues with a friendly, professional tone.',
    category: 'customer-support',
    icon: 'MessageCircle',
    color: '#3B82F6',
    capabilities: ['Answer FAQs', 'Escalate complex issues', 'Provide product information', 'Handle complaints'],
    useCases: ['Website chat', 'Email support', 'Help desk'],
    tags: ['support', 'customer-service', 'chat'],
    complexity: 'simple',
    estimatedTime: '5 min'
  },
  {
    id: 'sales-outbound',
    name: 'Sales Outbound Specialist',
    description: 'Proactively contact prospects, qualify leads, and schedule sales calls with personalized outreach.',
    category: 'sales',
    icon: 'TrendingUp',
    color: '#10B981',
    capabilities: ['Lead qualification', 'Cold calling', 'Follow-up automation', 'Pipeline management'],
    useCases: ['Lead generation', 'Sales calls', 'Follow-up sequences'],
    tags: ['sales', 'leads', 'outbound'],
    complexity: 'medium',
    estimatedTime: '10 min'
  },
  {
    id: 'content-creator',
    name: 'Content Creation Assistant',
    description: 'Generate blog posts, social media content, marketing copy, and creative writing with brand consistency.',
    category: 'content',
    icon: 'FileText',
    color: '#8B5CF6',
    capabilities: ['Blog writing', 'Social media posts', 'Email campaigns', 'SEO optimization'],
    useCases: ['Marketing content', 'Social media', 'Blog posts'],
    tags: ['content', 'marketing', 'writing'],
    complexity: 'medium',
    estimatedTime: '8 min'
  },
  {
    id: 'hr-recruiter',
    name: 'HR Recruitment Assistant',
    description: 'Screen candidates, schedule interviews, and handle initial HR communications throughout the hiring process.',
    category: 'hr',
    icon: 'Users',
    color: '#F59E0B',
    capabilities: ['Resume screening', 'Interview scheduling', 'Candidate communication', 'Background checks'],
    useCases: ['Recruitment', 'HR support', 'Hiring process'],
    tags: ['hr', 'recruitment', 'hiring'],
    complexity: 'advanced',
    estimatedTime: '15 min'
  },
  {
    id: 'data-analyst',
    name: 'Data Analysis Assistant',
    description: 'Analyze data trends, generate reports, and provide insights from various data sources and databases.',
    category: 'analytics',
    icon: 'BarChart',
    color: '#EF4444',
    capabilities: ['Data visualization', 'Report generation', 'Trend analysis', 'KPI tracking'],
    useCases: ['Business intelligence', 'Data reporting', 'Analytics'],
    tags: ['analytics', 'data', 'reports'],
    complexity: 'advanced',
    estimatedTime: '12 min'
  },
  {
    id: 'ecommerce-assistant',
    name: 'E-commerce Assistant',
    description: 'Handle product inquiries, process orders, manage inventory, and provide shopping assistance.',
    category: 'ecommerce',
    icon: 'ShoppingCart',
    color: '#06B6D4',
    capabilities: ['Order processing', 'Product recommendations', 'Inventory management', 'Customer orders'],
    useCases: ['Online store', 'Shopping assistance', 'Order management'],
    tags: ['ecommerce', 'shopping', 'orders'],
    complexity: 'medium',
    estimatedTime: '10 min'
  }
];

// Dummy Agents
export const dummyAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Customer Support Bot',
    description: 'Handles customer inquiries and support tickets',
    status: 'active',
    category: 'customer-support',
    capabilities: ['Answer FAQs', 'Ticket creation', 'Escalation'],
    kpis: [
      { label: 'Messages', value: '1,234', trend: 'up' },
      { label: 'Resolution Rate', value: '87%', trend: 'up' },
      { label: 'Avg Response Time', value: '2.3s', trend: 'down' },
      { label: 'Satisfaction', value: '4.8/5', trend: 'stable' }
    ],
    lastActivity: '2 minutes ago',
    tags: ['support', 'active']
  },
  {
    id: 'agent-2',
    name: 'Sales Assistant',
    description: 'Qualifies leads and schedules sales calls',
    status: 'active',
    category: 'sales',
    capabilities: ['Lead qualification', 'Call scheduling', 'Follow-up'],
    kpis: [
      { label: 'Leads Qualified', value: '45', trend: 'up' },
      { label: 'Conversion Rate', value: '23%', trend: 'up' },
      { label: 'Calls Scheduled', value: '12', trend: 'stable' },
      { label: 'Pipeline Value', value: '$45K', trend: 'up' }
    ],
    lastActivity: '5 minutes ago',
    tags: ['sales', 'leads']
  },
  {
    id: 'agent-3',
    name: 'Content Creator',
    description: 'Generates marketing content and social media posts',
    status: 'paused',
    category: 'content',
    capabilities: ['Blog writing', 'Social posts', 'Email content'],
    kpis: [
      { label: 'Articles', value: '8', trend: 'stable' },
      { label: 'Social Posts', value: '24', trend: 'down' },
      { label: 'Engagement Rate', value: '5.2%', trend: 'up' },
      { label: 'Views', value: '12.5K', trend: 'up' }
    ],
    lastActivity: '1 hour ago',
    tags: ['content', 'paused']
  },
  {
    id: 'agent-4',
    name: 'HR Assistant',
    description: 'Assists with recruitment and employee inquiries',
    status: 'active',
    category: 'hr',
    capabilities: ['Resume screening', 'Interview scheduling', 'Onboarding'],
    kpis: [
      { label: 'Candidates Screened', value: '67', trend: 'up' },
      { label: 'Interviews Scheduled', value: '15', trend: 'stable' },
      { label: 'Time to Hire', value: '12 days', trend: 'down' },
      { label: 'Satisfaction', value: '4.6/5', trend: 'stable' }
    ],
    lastActivity: '30 minutes ago',
    tags: ['hr', 'recruitment']
  }
];

// Use Case Categories
export const useCaseCategories = [
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handle customer inquiries and support',
    icon: 'MessageCircle',
    color: '#3B82F6'
  },
  {
    id: 'sales',
    name: 'Sales & Lead Gen',
    description: 'Qualify leads and drive sales',
    icon: 'TrendingUp',
    color: '#10B981'
  },
  {
    id: 'content',
    name: 'Content Creation',
    description: 'Generate marketing content',
    icon: 'FileText',
    color: '#8B5CF6'
  },
  {
    id: 'hr',
    name: 'HR & Recruitment',
    description: 'Assist with hiring process',
    icon: 'Users',
    color: '#F59E0B'
  },
  {
    id: 'analytics',
    name: 'Data Analysis',
    description: 'Analyze data and generate insights',
    icon: 'BarChart',
    color: '#EF4444'
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Handle online sales and orders',
    icon: 'ShoppingCart',
    color: '#06B6D4'
  }
];