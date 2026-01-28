'use client';

/**
 * Brain AI Dashboard - Client Component
 * Interactive features with state management
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KnowledgeLibrary } from './KnowledgeLibrary';
import { ActiveContextsViewer } from './ActiveContextsViewer';
import { InsightsDashboard } from './InsightsDashboard';
import { KnowledgeGraph } from './KnowledgeGraph';
import {
  FileText,
  MessageSquare,
  TrendingUp,
  Network,
  RefreshCw,
} from 'lucide-react';

interface BrainDashboardClientProps {
  initialActivity?: any;
  initialStats?: any;
}

export function BrainDashboardClient({
  initialActivity,
  initialStats,
}: BrainDashboardClientProps) {
  const [activeTab, setActiveTab] = useState('knowledge');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refresh for all components
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <div className="brain-dashboard-client">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="brain-tabs">
        {/* Tab Navigation */}
        <div className="brain-tabs-header">
          <TabsList className="brain-tabs-list">
            <TabsTrigger value="knowledge" className="brain-tab">
              <FileText className="brain-tab-icon" size={16} />
              <span>Knowledge Library</span>
            </TabsTrigger>

            <TabsTrigger value="contexts" className="brain-tab">
              <MessageSquare className="brain-tab-icon" size={16} />
              <span>Active Contexts</span>
            </TabsTrigger>

            <TabsTrigger value="insights" className="brain-tab">
              <TrendingUp className="brain-tab-icon" size={16} />
              <span>Insights</span>
            </TabsTrigger>

            <TabsTrigger value="graph" className="brain-tab">
              <Network className="brain-tab-icon" size={16} />
              <span>Knowledge Graph</span>
            </TabsTrigger>
          </TabsList>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="brain-refresh-btn"
            aria-label="Refresh data"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'brain-refresh-spinning' : ''}
            />
          </button>
        </div>

        {/* Tab Content */}
        <div className="brain-tabs-content">
          <TabsContent value="knowledge" className="brain-tab-panel">
            <KnowledgeLibrary />
          </TabsContent>

          <TabsContent value="contexts" className="brain-tab-panel">
            <ActiveContextsViewer />
          </TabsContent>

          <TabsContent value="insights" className="brain-tab-panel">
            <InsightsDashboard initialStats={initialStats} />
          </TabsContent>

          <TabsContent value="graph" className="brain-tab-panel">
            <KnowledgeGraph />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
