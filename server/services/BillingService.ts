import { getDb } from '@/lib/db/connection';
import { billingTransactions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { budgetService } from './BudgetService';

export class BillingService {
  private db = getDb();

  /**
   * Process a credit top-up
   * Records the transaction and updates user budget limits
   */
  async processTopUp(userId: string, packageId: string, amount: number, tokens: number) {
    // 1. Create transaction record
    await this.db.insert(billingTransactions).values({
      userId,
      packageId,
      amount: String(amount),
      tokens,
      status: 'completed', // In a real app, this would be 'pending' until webhook confirmation
      metadata: { type: 'top-up', source: 'user_action' }
    });

    // 2. Get current budget to calculate new limits
    const budget = await budgetService.getUserBudget(userId);
    
    // Calculate new limits
    const currentCostLimit = Number(budget.monthlyCostLimitUsd || 0);
    const currentTokenLimit = budget.monthlyTokenLimit || 0;
    
    const newCostLimit = currentCostLimit + amount;
    const newTokenLimit = currentTokenLimit + tokens;

    // 3. Update budget limits
    await budgetService.updateBudgetLimits(userId, {
        monthlyCostLimitUsd: newCostLimit,
        monthlyTokenLimit: newTokenLimit
    });

    return { 
      success: true, 
      newLimits: {
        cost: newCostLimit,
        tokens: newTokenLimit
      }
    };
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string) {
      return await this.db.select()
        .from(billingTransactions)
        .where(eq(billingTransactions.userId, userId))
        .orderBy(desc(billingTransactions.createdAt));
  }
}

export const billingService = new BillingService();
