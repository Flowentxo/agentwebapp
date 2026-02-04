'use client';

import { memo, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components once
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Agent {
  color: string;
  stats: {
    conversationsToday: number;
    successRate: number;
  };
}

interface PerformanceChartProps {
  agent: Agent;
}

const generateChartData = (agent: Agent) => {
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const conversationsData = [180, 220, 195, 240, 210, 185, agent.stats.conversationsToday];
  const successRateData = [91, 93, 90, 94, 92, 89, agent.stats.successRate];

  return {
    labels,
    datasets: [
      {
        label: 'Konversationen',
        data: conversationsData,
        borderColor: agent.color,
        backgroundColor: `${agent.color}20`,
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Success Rate (%)',
        data: successRateData,
        borderColor: '#10b981',
        backgroundColor: '#10b98120',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: '#9ca3af',
        font: {
          size: 11
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#374151',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        color: '#1f2937',
        drawBorder: false
      },
      ticks: {
        color: '#9ca3af',
        font: {
          size: 11
        }
      }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      grid: {
        color: '#1f2937',
        drawBorder: false
      },
      ticks: {
        color: '#9ca3af',
        font: {
          size: 11
        }
      }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      grid: {
        drawOnChartArea: false,
        color: '#1f2937',
        drawBorder: false
      },
      ticks: {
        color: '#9ca3af',
        font: {
          size: 11
        }
      }
    }
  }
};

export const PerformanceChart = memo(function PerformanceChart({ agent }: PerformanceChartProps) {
  const chartData = useMemo(() => generateChartData(agent), [agent.color, agent.stats.conversationsToday, agent.stats.successRate]);

  return (
    <div className="h-64">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
});
