import { AgentsPage } from '@/components/agents/AgentsPage';

export const metadata = {
  title: 'Agents · SINTRA SYSTEM',
  description: 'Browse and manage all AI agents in the Sintra System. Monitor performance, configure settings, and deploy intelligent automation.',
  alternates: {
    canonical: '/agents',
  },
};

export default function Page() {
  return <AgentsPage />;
}
