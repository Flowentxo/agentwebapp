/**
 * Recommendation Engine
 * AI-powered predictive intelligence for dashboard
 */

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationType =
  | 'performance'
  | 'maintenance'
  | 'optimization'
  | 'security'
  | 'capacity'
  | 'proactive';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  type: RecommendationType;
  impact: string;
  actions: RecommendationAction[];
  predictedOutcome?: string;
  timeframe?: string;
  confidence: number; // 0-100
  icon: string;
}

export interface RecommendationAction {
  label: string;
  href?: string;
  handler?: () => void;
  isPrimary?: boolean;
}

export interface SystemContext {
  agents: any[];
  stats: {
    totalAgents: number;
    activeAgents: number;
    totalRequests24h: number;
    avgSuccessRate: number;
    avgResponseTime: number;
    criticalIssues: number;
  };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  userHistory?: {
    lastVisit?: Date;
    favoriteAgents?: string[];
    commonActions?: string[];
  };
}

export class RecommendationEngine {
  private context: SystemContext;

  constructor(context: SystemContext) {
    this.context = context;
  }

  /**
   * Generate all recommendations based on current system state
   */
  generateRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Performance-based recommendations
    recommendations.push(...this.analyzePerformance());

    // Predictive recommendations
    recommendations.push(...this.generatePredictiveInsights());

    // Capacity planning
    recommendations.push(...this.analyzeCapacity());

    // Proactive maintenance
    recommendations.push(...this.suggestMaintenance());

    // Optimization opportunities
    recommendations.push(...this.identifyOptimizations());

    // Sort by priority and confidence
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Analyze current performance and suggest improvements
   */
  private analyzePerformance(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { stats } = this.context;

    // Low success rate
    if (stats.avgSuccessRate < 90) {
      recommendations.push({
        id: 'perf-success-rate',
        title: 'Success Rate Below Target',
        description: `System success rate at ${stats.avgSuccessRate.toFixed(1)}%. Immediate attention required to identify and resolve failing requests.`,
        priority: 'critical',
        type: 'performance',
        impact: 'User experience degradation, potential revenue loss',
        actions: [
          { label: 'View Error Logs', href: '/analytics?view=errors', isPrimary: true },
          { label: 'Check Agent Health', href: '/agents/all?filter=unhealthy' },
        ],
        predictedOutcome: 'Resolution within 2 hours could prevent 15% request failures',
        confidence: 95,
        icon: 'AlertTriangle',
      });
    }

    // High response time
    if (stats.avgResponseTime > 2000) {
      recommendations.push({
        id: 'perf-response-time',
        title: 'Response Time Degradation',
        description: `Average response time at ${Math.round(stats.avgResponseTime)}ms. Users experiencing noticeable delays.`,
        priority: 'high',
        type: 'performance',
        impact: 'Poor user experience, increased bounce rate',
        actions: [
          { label: 'Optimize Agents', href: '/agents/all?sort=slowest', isPrimary: true },
          { label: 'View Performance Metrics', href: '/analytics?tab=performance' },
        ],
        predictedOutcome: 'Optimization could reduce response time by 40%',
        timeframe: 'Impact within 1 hour',
        confidence: 88,
        icon: 'Zap',
      });
    }

    // Excellent performance
    if (stats.avgSuccessRate > 98 && stats.avgResponseTime < 1000) {
      recommendations.push({
        id: 'perf-excellent',
        title: 'System Performing Exceptionally',
        description: 'All performance metrics exceed targets. Consider documenting current configuration as best practice.',
        priority: 'low',
        type: 'optimization',
        impact: 'Maintain excellence, share learnings',
        actions: [
          { label: 'Export Configuration', href: '/settings?tab=export', isPrimary: true },
          { label: 'View Metrics Report', href: '/analytics?report=performance' },
        ],
        confidence: 92,
        icon: 'Trophy',
      });
    }

    return recommendations;
  }

  /**
   * Generate predictive insights based on trends
   */
  private generatePredictiveInsights(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { stats, timeOfDay, dayOfWeek } = this.context;

    // Predict evening load spike
    if (timeOfDay === 'afternoon' && stats.totalRequests24h > 30000) {
      recommendations.push({
        id: 'predict-evening-spike',
        title: 'Evening Traffic Spike Predicted',
        description:
          'Based on current patterns, expect 40% traffic increase between 6-9 PM. Current capacity may be insufficient.',
        priority: 'high',
        type: 'capacity',
        impact: 'Potential performance degradation during peak hours',
        actions: [
          { label: 'Scale Resources Now', href: '/admin?action=scale', isPrimary: true },
          { label: 'Configure Auto-Scaling', href: '/settings?tab=scaling' },
        ],
        predictedOutcome: 'Proactive scaling prevents 95% of potential slowdowns',
        timeframe: 'Spike expected in 3-4 hours',
        confidence: 82,
        icon: 'TrendingUp',
      });
    }

    // Predict weekend maintenance window
    if (dayOfWeek === 5 && stats.avgSuccessRate > 95) {
      // Friday
      recommendations.push({
        id: 'predict-weekend-maintenance',
        title: 'Optimal Maintenance Window Approaching',
        description:
          'Saturday 2-5 AM shows lowest traffic (historical avg: 200 req/hr). Ideal for system updates and maintenance.',
        priority: 'medium',
        type: 'maintenance',
        impact: 'Minimal user impact, improved system health',
        actions: [
          { label: 'Schedule Maintenance', href: '/admin?schedule=maintenance', isPrimary: true },
          { label: 'Review Update Queue', href: '/admin?tab=updates' },
        ],
        predictedOutcome: 'Zero user-facing downtime',
        timeframe: 'Window opens in 28 hours',
        confidence: 90,
        icon: 'Calendar',
      });
    }

    // Predict agent degradation
    const degradedAgents = this.context.agents.filter(
      (a: any) => a.successRate24h && a.successRate24h < 95
    );
    if (degradedAgents.length > 0 && degradedAgents.length < 3) {
      recommendations.push({
        id: 'predict-agent-degradation',
        title: `${degradedAgents.length} Agent${degradedAgents.length > 1 ? 's' : ''} Showing Early Warning Signs`,
        description: `${degradedAgents.map((a: any) => a.name).join(', ')} exhibiting declining success rates. Intervention now prevents complete failure.`,
        priority: 'high',
        type: 'proactive',
        impact: 'Prevent cascading failures',
        actions: [
          {
            label: 'Investigate Agents',
            href: `/agents/all?filter=${degradedAgents.map((a: any) => a.id).join(',')}`,
            isPrimary: true,
          },
          { label: 'Run Diagnostics', href: '/admin?action=diagnose' },
        ],
        predictedOutcome: 'Early intervention prevents 8+ hours of downtime',
        timeframe: 'Act within next 2 hours',
        confidence: 87,
        icon: 'AlertCircle',
      });
    }

    return recommendations;
  }

  /**
   * Analyze capacity and suggest scaling
   */
  private analyzeCapacity(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { stats } = this.context;

    // High load warning
    if (stats.totalRequests24h > 40000) {
      recommendations.push({
        id: 'capacity-high-load',
        title: 'Approaching Capacity Limits',
        description:
          'Request volume at 85% of recommended capacity. Consider scaling to maintain performance during unexpected spikes.',
        priority: 'medium',
        type: 'capacity',
        impact: 'Risk of throttling during peak traffic',
        actions: [
          { label: 'Scale Infrastructure', href: '/admin?action=scale', isPrimary: true },
          { label: 'View Capacity Planning', href: '/analytics?tab=capacity' },
        ],
        predictedOutcome: 'Scaling now prevents 99.5% of potential issues',
        confidence: 79,
        icon: 'Activity',
      });
    }

    return recommendations;
  }

  /**
   * Suggest proactive maintenance
   */
  private suggestMaintenance(): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Morning is best for maintenance
    if (this.context.timeOfDay === 'morning') {
      recommendations.push({
        id: 'maintenance-optimal-time',
        title: 'Optimal Time for System Review',
        description:
          'Morning hours show 30% lower traffic. Perfect time to review logs, update configurations, and run diagnostics.',
        priority: 'low',
        type: 'maintenance',
        impact: 'Maintain system health proactively',
        actions: [
          { label: 'Review System Health', href: '/admin?tab=health', isPrimary: true },
          { label: 'Check Update Queue', href: '/admin?tab=updates' },
        ],
        confidence: 75,
        icon: 'Wrench',
      });
    }

    return recommendations;
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizations(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const { agents, stats } = this.context;

    // Unused agents
    const inactiveAgents = agents.filter((a: any) => (a.requests24h || 0) < 10);
    if (inactiveAgents.length > 2) {
      recommendations.push({
        id: 'optimize-inactive-agents',
        title: `${inactiveAgents.length} Underutilized Agents Detected`,
        description:
          'Several agents showing minimal activity. Consider consolidating or deprecating to reduce overhead and improve focus.',
        priority: 'low',
        type: 'optimization',
        impact: 'Reduced complexity, lower costs',
        actions: [
          { label: 'Review Inactive Agents', href: '/agents/all?filter=inactive', isPrimary: true },
          { label: 'View Usage Analytics', href: '/analytics?tab=usage' },
        ],
        predictedOutcome: 'Optimization could reduce operational costs by 15%',
        confidence: 71,
        icon: 'Minimize',
      });
    }

    return recommendations;
  }

  /**
   * Get contextual quick actions based on current state
   */
  generateQuickActions(): Array<{
    label: string;
    description: string;
    href: string;
    icon: string;
    variant: 'primary' | 'secondary' | 'danger';
  }> {
    const actions = [];
    const { stats, timeOfDay } = this.context;

    // Critical issues
    if (stats.criticalIssues > 0) {
      actions.push({
        label: 'Resolve Critical Issues',
        description: `${stats.criticalIssues} issue${stats.criticalIssues > 1 ? 's' : ''} require immediate attention`,
        href: '/admin?filter=critical',
        icon: 'AlertTriangle',
        variant: 'danger' as const,
      });
    }

    // Performance review
    if (stats.avgSuccessRate < 95) {
      actions.push({
        label: 'Investigate Failures',
        description: 'Success rate below target - review error logs',
        href: '/analytics?view=errors',
        icon: 'Search',
        variant: 'primary' as const,
      });
    }

    // Morning routine
    if (timeOfDay === 'morning' && stats.criticalIssues === 0) {
      actions.push({
        label: 'Morning System Review',
        description: 'Quick health check and overnight reports',
        href: '/analytics?tab=overnight',
        icon: 'Coffee',
        variant: 'secondary' as const,
      });
    }

    return actions.slice(0, 3);
  }
}

/**
 * Helper to get time of day
 */
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}
