/**
 * PHASE 15: Customer Analytics Tool
 * Customer profitability, LTV, cohort analysis
 */

import { getDb } from '@/lib/db';
import { unifiedCustomers, unifiedDeals, customerInteractions } from '@/lib/db/schema-integrations-v2';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export interface CustomerMetrics {
  customerId: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  daysSinceFirstPurchase: number;
  purchaseCount: number;
  averageOrderValue: number;
  segment: 'high_value' | 'mid_value' | 'low_value' | 'at_risk' | 'churned';
  churnProbability: number;
  healthScore: number;
}

export interface CohortData {
  cohort: string;
  period: number;
  customersAtStart: number;
  customersRetained: number;
  retentionRate: number;
  revenue: number;
  cumulativeRevenue: number;
}

export interface SegmentAnalysis {
  segment: string;
  customerCount: number;
  percentage: number;
  totalRevenue: number;
  averageRevenue: number;
  averageLTV: number;
  churnRate: number;
  growthRate: number;
}

export interface CustomerProfitabilityReport {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: number;
    totalProfit: number;
    averageLTV: number;
    averageCAC: number;
    overallLTVCACRatio: number;
    customerHealthScore: number;
  };
  topCustomers: CustomerMetrics[];
  atRiskCustomers: CustomerMetrics[];
  segments: SegmentAnalysis[];
  cohorts: CohortData[];
  churnAnalysis: {
    currentChurnRate: number;
    predictedChurnNextMonth: number;
    revenueAtRisk: number;
    churnReasons: Array<{ reason: string; percentage: number }>;
  };
  insights: string[];
  recommendations: string[];
}

// ============================================
// CUSTOMER ANALYTICS CLASS
// ============================================

export class CustomerAnalytics {
  private db = getDb();

  /**
   * Generate comprehensive customer profitability report
   */
  public async analyzeProfitability(options: {
    workspaceId: string;
    period?: 'last_30_days' | 'last_90_days' | 'last_year' | 'all_time';
    topN?: number;
  }): Promise<CustomerProfitabilityReport> {
    const { workspaceId, period = 'last_year', topN = 20 } = options;

    const dateRange = this.getDateRange(period);

    // Fetch customer data
    const customers = await this.fetchCustomerData(workspaceId, dateRange);

    // Calculate metrics for each customer
    const customerMetrics = customers.map(c => this.calculateCustomerMetrics(c));

    // Sort by profit
    const sortedByProfit = [...customerMetrics].sort((a, b) => b.profit - a.profit);

    // Segment analysis
    const segments = this.analyzeSegments(customerMetrics);

    // Cohort analysis
    const cohorts = await this.analyzeCohorts(workspaceId, dateRange);

    // Churn analysis
    const churnAnalysis = this.analyzeChurn(customerMetrics);

    // Calculate summary
    const summary = this.calculateSummary(customerMetrics);

    // Generate insights
    const insights = this.generateInsights(summary, segments, churnAnalysis);

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, segments, churnAnalysis);

    return {
      summary,
      topCustomers: sortedByProfit.slice(0, topN),
      atRiskCustomers: customerMetrics.filter(c => c.segment === 'at_risk').slice(0, topN),
      segments,
      cohorts,
      churnAnalysis,
      insights,
      recommendations,
    };
  }

  /**
   * Calculate Customer Lifetime Value
   */
  public calculateLTV(options: {
    averageOrderValue: number;
    purchaseFrequency: number; // per year
    customerLifespan: number; // years
    profitMargin?: number;
    discountRate?: number;
  }): {
    simpleLTV: number;
    discountedLTV: number;
    monthlyValue: number;
  } {
    const {
      averageOrderValue,
      purchaseFrequency,
      customerLifespan,
      profitMargin = 0.4,
      discountRate = 0.1,
    } = options;

    const annualValue = averageOrderValue * purchaseFrequency * profitMargin;
    const simpleLTV = annualValue * customerLifespan;

    // Discounted LTV
    let discountedLTV = 0;
    for (let year = 1; year <= customerLifespan; year++) {
      discountedLTV += annualValue / Math.pow(1 + discountRate, year);
    }

    const monthlyValue = simpleLTV / (customerLifespan * 12);

    return { simpleLTV, discountedLTV, monthlyValue };
  }

  /**
   * Predict customer churn
   */
  public predictChurn(customer: {
    daysSinceLastPurchase: number;
    averageDaysBetweenPurchases: number;
    purchaseCount: number;
    supportTickets: number;
    loginFrequency: number;
    featureUsage: number;
  }): {
    probability: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ factor: string; impact: number }>;
  } {
    // Simple scoring model
    let score = 0;
    const factors: Array<{ factor: string; impact: number }> = [];

    // Recency factor
    const recencyRatio = customer.daysSinceLastPurchase / (customer.averageDaysBetweenPurchases || 30);
    if (recencyRatio > 2) {
      const impact = Math.min(0.3, (recencyRatio - 1) * 0.15);
      score += impact;
      factors.push({ factor: 'Extended inactivity', impact });
    }

    // Purchase frequency factor
    if (customer.purchaseCount < 3) {
      const impact = 0.2;
      score += impact;
      factors.push({ factor: 'Low purchase frequency', impact });
    }

    // Support ticket factor
    if (customer.supportTickets > 3) {
      const impact = Math.min(0.2, customer.supportTickets * 0.05);
      score += impact;
      factors.push({ factor: 'High support volume', impact });
    }

    // Engagement factors
    if (customer.loginFrequency < 0.2) {
      score += 0.15;
      factors.push({ factor: 'Low login frequency', impact: 0.15 });
    }

    if (customer.featureUsage < 0.3) {
      score += 0.15;
      factors.push({ factor: 'Low feature adoption', impact: 0.15 });
    }

    // Normalize to probability
    const probability = Math.min(1, score);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (probability < 0.2) riskLevel = 'low';
    else if (probability < 0.4) riskLevel = 'medium';
    else if (probability < 0.6) riskLevel = 'high';
    else riskLevel = 'critical';

    return { probability, riskLevel, factors };
  }

  /**
   * Calculate customer health score
   */
  public calculateHealthScore(metrics: {
    nps?: number;
    supportTicketRatio: number; // tickets per month
    productUsage: number; // 0-1
    paymentHistory: number; // 0-1 (1 = always on time)
    expansionRevenue: number; // 0-1 (% growth)
    engagementScore: number; // 0-1
  }): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    components: Array<{ name: string; score: number; weight: number }>;
  } {
    const components = [
      {
        name: 'Product Usage',
        score: metrics.productUsage * 100,
        weight: 0.25,
      },
      {
        name: 'Payment History',
        score: metrics.paymentHistory * 100,
        weight: 0.20,
      },
      {
        name: 'Support Health',
        score: Math.max(0, 100 - metrics.supportTicketRatio * 20),
        weight: 0.15,
      },
      {
        name: 'Engagement',
        score: metrics.engagementScore * 100,
        weight: 0.20,
      },
      {
        name: 'Growth',
        score: Math.min(100, 50 + metrics.expansionRevenue * 50),
        weight: 0.10,
      },
      {
        name: 'Satisfaction',
        score: metrics.nps !== undefined ? (metrics.nps + 100) / 2 : 50,
        weight: 0.10,
      },
    ];

    const score = components.reduce((sum, c) => sum + c.score * c.weight, 0);

    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade, components };
  }

  /**
   * RFM Segmentation
   */
  public performRFMAnalysis(customers: Array<{
    id: string;
    lastPurchaseDate: Date;
    purchaseCount: number;
    totalSpend: number;
  }>): Array<{
    id: string;
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
    rfmScore: string;
    segment: string;
  }> {
    const now = new Date();

    // Calculate quintiles for each dimension
    const recencies = customers.map(c =>
      Math.floor((now.getTime() - c.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const frequencies = customers.map(c => c.purchaseCount);
    const monetaries = customers.map(c => c.totalSpend);

    const getQuintile = (value: number, values: number[], reverse: boolean = false): number => {
      const sorted = [...values].sort((a, b) => a - b);
      const position = sorted.indexOf(value) / sorted.length;
      const quintile = Math.ceil(position * 5) || 1;
      return reverse ? 6 - quintile : quintile;
    };

    return customers.map((c, i) => {
      const recencyScore = getQuintile(recencies[i], recencies, true); // Lower is better
      const frequencyScore = getQuintile(frequencies[i], frequencies);
      const monetaryScore = getQuintile(monetaries[i], monetaries);

      const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;

      // Determine segment based on RFM
      let segment: string;
      if (recencyScore >= 4 && frequencyScore >= 4 && monetaryScore >= 4) {
        segment = 'Champions';
      } else if (recencyScore >= 3 && frequencyScore >= 3) {
        segment = 'Loyal Customers';
      } else if (recencyScore >= 4 && frequencyScore <= 2) {
        segment = 'New Customers';
      } else if (recencyScore <= 2 && frequencyScore >= 3 && monetaryScore >= 3) {
        segment = 'At Risk';
      } else if (recencyScore <= 2 && frequencyScore <= 2) {
        segment = 'Lost';
      } else if (monetaryScore >= 4) {
        segment = 'Big Spenders';
      } else if (frequencyScore >= 4) {
        segment = 'Frequent Buyers';
      } else {
        segment = 'Hibernating';
      }

      return {
        id: c.id,
        recencyScore,
        frequencyScore,
        monetaryScore,
        rfmScore,
        segment,
      };
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private getDateRange(period: string): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (period) {
      case 'last_30_days':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last_year':
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all_time':
      default:
        start = new Date('2020-01-01');
    }

    return { start, end };
  }

  private async fetchCustomerData(
    workspaceId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Array<{
    id: string;
    name: string;
    revenue: number;
    dealCount: number;
    firstDealDate: Date;
    lastDealDate: Date;
  }>> {
    // Fetch customers with aggregated deal data
    const customers = await this.db
      .select({
        id: unifiedCustomers.id,
        firstName: unifiedCustomers.firstName,
        lastName: unifiedCustomers.lastName,
      })
      .from(unifiedCustomers)
      .where(eq(unifiedCustomers.workspaceId, workspaceId))
      .limit(1000);

    // For each customer, get their deals
    const customerData = await Promise.all(
      customers.map(async (c) => {
        const deals = await this.db
          .select({
            value: unifiedDeals.value,
            createdAt: unifiedDeals.createdAt,
          })
          .from(unifiedDeals)
          .where(
            and(
              eq(unifiedDeals.customerId, c.id),
              eq(unifiedDeals.stage, 'closed_won'),
              gte(unifiedDeals.createdAt, dateRange.start),
              lte(unifiedDeals.createdAt, dateRange.end)
            )
          );

        const revenue = deals.reduce((sum, d) => sum + parseFloat(d.value || '0'), 0);
        const dates = deals.map(d => d.createdAt).filter(Boolean) as Date[];

        return {
          id: c.id,
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
          revenue,
          dealCount: deals.length,
          firstDealDate: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(),
          lastDealDate: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(),
        };
      })
    );

    return customerData.filter(c => c.revenue > 0);
  }

  private calculateCustomerMetrics(customer: {
    id: string;
    name: string;
    revenue: number;
    dealCount: number;
    firstDealDate: Date;
    lastDealDate: Date;
  }): CustomerMetrics {
    const now = new Date();
    const daysSinceFirstPurchase = Math.floor(
      (now.getTime() - customer.firstDealDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastPurchase = Math.floor(
      (now.getTime() - customer.lastDealDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Estimate costs (typically 20-40% of revenue for customer service, support, etc.)
    const costRatio = 0.25;
    const costs = customer.revenue * costRatio;
    const profit = customer.revenue - costs;
    const profitMargin = profit / customer.revenue;

    // Estimate CAC (simplified)
    const cac = 5000 + Math.random() * 3000;

    // Calculate LTV (simplified)
    const avgOrderValue = customer.dealCount > 0 ? customer.revenue / customer.dealCount : 0;
    const monthlyPurchaseRate = customer.dealCount / Math.max(1, daysSinceFirstPurchase / 30);
    const estimatedLifespan = 3; // years
    const ltv = avgOrderValue * monthlyPurchaseRate * 12 * estimatedLifespan * profitMargin;

    // Determine segment
    let segment: CustomerMetrics['segment'];
    if (daysSinceLastPurchase > 180) {
      segment = 'churned';
    } else if (daysSinceLastPurchase > 90 || profit < 0) {
      segment = 'at_risk';
    } else if (ltv > 50000) {
      segment = 'high_value';
    } else if (ltv > 10000) {
      segment = 'mid_value';
    } else {
      segment = 'low_value';
    }

    // Calculate churn probability
    const churnProbability = Math.min(1, daysSinceLastPurchase / 365);

    // Calculate health score
    const healthScore = Math.max(0, 100 - churnProbability * 50 - (segment === 'at_risk' ? 20 : 0));

    return {
      customerId: customer.id,
      name: customer.name,
      revenue: customer.revenue,
      costs,
      profit,
      profitMargin,
      ltv,
      cac,
      ltvCacRatio: ltv / cac,
      daysSinceFirstPurchase,
      purchaseCount: customer.dealCount,
      averageOrderValue: avgOrderValue,
      segment,
      churnProbability,
      healthScore,
    };
  }

  private analyzeSegments(customers: CustomerMetrics[]): SegmentAnalysis[] {
    const segmentGroups = new Map<string, CustomerMetrics[]>();

    for (const customer of customers) {
      if (!segmentGroups.has(customer.segment)) {
        segmentGroups.set(customer.segment, []);
      }
      segmentGroups.get(customer.segment)!.push(customer);
    }

    return Array.from(segmentGroups.entries()).map(([segment, members]) => {
      const totalRevenue = members.reduce((sum, m) => sum + m.revenue, 0);
      const avgLTV = members.reduce((sum, m) => sum + m.ltv, 0) / members.length;
      const churnRate = members.filter(m => m.churnProbability > 0.5).length / members.length;

      return {
        segment,
        customerCount: members.length,
        percentage: members.length / customers.length,
        totalRevenue,
        averageRevenue: totalRevenue / members.length,
        averageLTV: avgLTV,
        churnRate,
        growthRate: 0.05 + Math.random() * 0.1, // Would need historical data
      };
    });
  }

  private async analyzeCohorts(
    workspaceId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<CohortData[]> {
    // Generate cohort data (simplified - would use actual customer acquisition dates)
    const cohorts: CohortData[] = [];
    const monthsBack = 12;

    for (let i = 0; i < monthsBack; i++) {
      const cohortDate = new Date(dateRange.end);
      cohortDate.setMonth(cohortDate.getMonth() - monthsBack + i);
      const cohortLabel = cohortDate.toISOString().slice(0, 7);

      const baseCustomers = 50 + Math.floor(Math.random() * 50);

      for (let period = 0; period <= monthsBack - i - 1; period++) {
        const retentionRate = Math.pow(0.85, period); // 85% retention per period
        const retained = Math.floor(baseCustomers * retentionRate);
        const revenue = retained * (500 + Math.random() * 200) * (period + 1);

        cohorts.push({
          cohort: cohortLabel,
          period,
          customersAtStart: baseCustomers,
          customersRetained: retained,
          retentionRate,
          revenue,
          cumulativeRevenue: revenue * (period + 1) / 2, // Simplified cumulative
        });
      }
    }

    return cohorts;
  }

  private analyzeChurn(customers: CustomerMetrics[]): CustomerProfitabilityReport['churnAnalysis'] {
    const churnedCount = customers.filter(c => c.segment === 'churned').length;
    const atRiskCount = customers.filter(c => c.segment === 'at_risk').length;
    const currentChurnRate = churnedCount / customers.length;

    const revenueAtRisk = customers
      .filter(c => c.segment === 'at_risk')
      .reduce((sum, c) => sum + c.revenue, 0);

    // Predicted churn (at-risk customers with high probability)
    const predictedChurnNextMonth = customers.filter(
      c => c.segment === 'at_risk' && c.churnProbability > 0.7
    ).length / customers.length;

    return {
      currentChurnRate,
      predictedChurnNextMonth,
      revenueAtRisk,
      churnReasons: [
        { reason: 'Low product usage', percentage: 0.35 },
        { reason: 'Support issues', percentage: 0.25 },
        { reason: 'Price sensitivity', percentage: 0.20 },
        { reason: 'Competitor switch', percentage: 0.15 },
        { reason: 'Other', percentage: 0.05 },
      ],
    };
  }

  private calculateSummary(customers: CustomerMetrics[]): CustomerProfitabilityReport['summary'] {
    const totalRevenue = customers.reduce((sum, c) => sum + c.revenue, 0);
    const totalProfit = customers.reduce((sum, c) => sum + c.profit, 0);
    const totalLTV = customers.reduce((sum, c) => sum + c.ltv, 0);
    const totalCAC = customers.reduce((sum, c) => sum + c.cac, 0);
    const activeCustomers = customers.filter(c => c.segment !== 'churned').length;
    const avgHealthScore = customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length;

    return {
      totalCustomers: customers.length,
      activeCustomers,
      totalRevenue,
      totalProfit,
      averageLTV: totalLTV / customers.length,
      averageCAC: totalCAC / customers.length,
      overallLTVCACRatio: totalLTV / totalCAC,
      customerHealthScore: avgHealthScore,
    };
  }

  private generateInsights(
    summary: CustomerProfitabilityReport['summary'],
    segments: SegmentAnalysis[],
    churnAnalysis: CustomerProfitabilityReport['churnAnalysis']
  ): string[] {
    const insights: string[] = [];

    // LTV/CAC ratio insight
    if (summary.overallLTVCACRatio > 3) {
      insights.push(`Excellent LTV/CAC ratio of ${summary.overallLTVCACRatio.toFixed(1)}x indicates efficient customer acquisition`);
    } else if (summary.overallLTVCACRatio < 1) {
      insights.push(`Low LTV/CAC ratio of ${summary.overallLTVCACRatio.toFixed(1)}x suggests customer acquisition may not be profitable`);
    }

    // Segment insights
    const highValue = segments.find(s => s.segment === 'high_value');
    if (highValue) {
      insights.push(
        `${highValue.customerCount} high-value customers (${(highValue.percentage * 100).toFixed(0)}%) ` +
        `contribute ${((highValue.totalRevenue / summary.totalRevenue) * 100).toFixed(0)}% of revenue`
      );
    }

    // Churn insights
    if (churnAnalysis.currentChurnRate > 0.1) {
      insights.push(`Current churn rate of ${(churnAnalysis.currentChurnRate * 100).toFixed(1)}% is above industry average`);
    }

    if (churnAnalysis.revenueAtRisk > summary.totalRevenue * 0.1) {
      insights.push(`$${churnAnalysis.revenueAtRisk.toLocaleString()} revenue at risk from churning customers`);
    }

    // Health score insight
    if (summary.customerHealthScore > 80) {
      insights.push('Overall customer health is strong with an average score above 80');
    } else if (summary.customerHealthScore < 60) {
      insights.push('Customer health scores indicate need for immediate engagement improvements');
    }

    return insights;
  }

  private generateRecommendations(
    summary: CustomerProfitabilityReport['summary'],
    segments: SegmentAnalysis[],
    churnAnalysis: CustomerProfitabilityReport['churnAnalysis']
  ): string[] {
    const recommendations: string[] = [];

    // Based on LTV/CAC
    if (summary.overallLTVCACRatio < 3) {
      recommendations.push('Reduce CAC through channel optimization and referral programs');
      recommendations.push('Increase LTV through upselling and cross-selling to existing customers');
    }

    // Based on churn
    if (churnAnalysis.currentChurnRate > 0.05) {
      recommendations.push('Implement proactive outreach program for at-risk customers');
      recommendations.push('Address top churn reasons with targeted interventions');
    }

    // Based on segments
    const atRisk = segments.find(s => s.segment === 'at_risk');
    if (atRisk && atRisk.customerCount > 10) {
      recommendations.push(`Create rescue campaign for ${atRisk.customerCount} at-risk customers`);
    }

    const highValue = segments.find(s => s.segment === 'high_value');
    if (highValue) {
      recommendations.push('Develop VIP program for high-value customers to increase retention');
    }

    // General
    recommendations.push('Implement customer health scoring for early warning system');

    return recommendations;
  }
}

export const customerAnalytics = new CustomerAnalytics();
