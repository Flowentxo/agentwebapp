import { CostDashboard } from '@/components/dashboard/CostDashboard';

export const metadata = {
  title: 'AI Cost Tracking | Flowent AI',
  description: 'Monitor your AI model usage and costs',
};

export default function CostTrackingPage() {
  return <CostDashboard />;
}
