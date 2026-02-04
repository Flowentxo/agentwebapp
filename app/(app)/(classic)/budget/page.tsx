'use client';

/**
 * Budget Page - Consumer Kiosk View
 *
 * This page renders the consumer-friendly PremiumBudgetPage component
 * with the 50/50 split layout (Subscription + Top-Up).
 *
 * For enterprise FinOps Terminal, see /settings/finops
 *
 * @version 6.0.0 - Consumer Kiosk Force-Update
 */

import { PremiumBudgetPage } from '@/components/dashboard/PremiumBudgetPage';

export default function BudgetPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      <PremiumBudgetPage />
    </div>
  );
}
