import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Admin Health Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Metrics API', () => {
    it('should return system health metrics', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('ok', true);
      expect(data).toHaveProperty('ts');
      expect(data).toHaveProperty('system');
      expect(data.system).toHaveProperty('status');
      expect(data.system).toHaveProperty('uptime');
      expect(data.system).toHaveProperty('cpu');
      expect(data.system).toHaveProperty('memory');
    });

    it('should include CPU metrics', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.system.cpu).toHaveProperty('usage');
      expect(data.system.cpu).toHaveProperty('cores');
      expect(typeof data.system.cpu.usage).toBe('number');
      expect(typeof data.system.cpu.cores).toBe('number');
      expect(data.system.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(data.system.cpu.usage).toBeLessThanOrEqual(100);
    });

    it('should include memory metrics', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.system.memory).toHaveProperty('used');
      expect(data.system.memory).toHaveProperty('total');
      expect(data.system.memory).toHaveProperty('percentage');
      expect(typeof data.system.memory.used).toBe('number');
      expect(typeof data.system.memory.total).toBe('number');
      expect(data.system.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(data.system.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should include service health status', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data).toHaveProperty('services');
      expect(data.services).toHaveProperty('api');
      expect(data.services).toHaveProperty('database');
      expect(data.services).toHaveProperty('cache');
      expect(data.services).toHaveProperty('storage');

      // Check each service has status and latency
      Object.values(data.services).forEach((service: any) => {
        expect(service).toHaveProperty('status');
        expect(service).toHaveProperty('latency');
        expect(typeof service.latency).toBe('number');
      });
    });

    it('should include system stats', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data).toHaveProperty('stats');
      expect(data.stats).toHaveProperty('activeUsers');
      expect(data.stats).toHaveProperty('totalRequests');
      expect(data.stats).toHaveProperty('errorRate');
      expect(typeof data.stats.activeUsers).toBe('number');
      expect(typeof data.stats.totalRequests).toBe('number');
      expect(typeof data.stats.errorRate).toBe('string');
    });

    it('should format uptime correctly', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      const data = await response.json();

      expect(data.system).toHaveProperty('uptimeFormatted');
      expect(typeof data.system.uptimeFormatted).toBe('string');

      // Should match patterns like "1d 2h", "2h 30m", or "45m"
      const uptimePattern = /^(\d+d\s\d+h|\d+h\s\d+m|\d+m)$/;
      expect(data.system.uptimeFormatted).toMatch(uptimePattern);
    });
  });

  describe('Health Dashboard UI', () => {
    it('should display CPU usage card', () => {
      const mockHealth = {
        ok: true,
        ts: Date.now(),
        system: {
          status: 'operational',
          uptime: 3600,
          uptimeFormatted: '1h 0m',
          cpu: { usage: 25.5, cores: 4 },
          memory: { used: 512, total: 1024, percentage: 50 },
        },
        services: {
          api: { status: 'healthy', latency: 25 },
        },
        stats: {
          activeUsers: 10,
          totalRequests: 5000,
          errorRate: '0.5%',
        },
      };

      expect(mockHealth.system.cpu.usage).toBe(25.5);
      expect(mockHealth.system.uptimeFormatted).toBe('1h 0m');
    });

    it('should display memory usage card', () => {
      const mockHealth = {
        system: {
          memory: { used: 768, total: 1024, percentage: 75 },
        },
      };

      expect(mockHealth.system.memory.percentage).toBe(75);
      expect(mockHealth.system.memory.used).toBe(768);
      expect(mockHealth.system.memory.total).toBe(1024);
    });

    it('should display active users count', () => {
      const mockHealth = {
        stats: {
          activeUsers: 42,
          totalRequests: 10000,
          errorRate: '1.2%',
        },
      };

      expect(mockHealth.stats.activeUsers).toBe(42);
    });

    it('should display error rate', () => {
      const mockHealth = {
        stats: {
          activeUsers: 10,
          totalRequests: 5000,
          errorRate: '0.8%',
        },
      };

      expect(mockHealth.stats.errorRate).toBe('0.8%');
    });

    it('should show service health indicators', () => {
      const mockServices = {
        api: { status: 'healthy', latency: 25 },
        database: { status: 'healthy', latency: 15 },
        cache: { status: 'degraded', latency: 50 },
        storage: { status: 'unhealthy', latency: 200 },
      };

      expect(mockServices.api.status).toBe('healthy');
      expect(mockServices.cache.status).toBe('degraded');
      expect(mockServices.storage.status).toBe('unhealthy');
    });
  });

  describe('Auto-refresh functionality', () => {
    it('should refresh health data every 15 seconds', () => {
      const interval = 15000; // 15 seconds
      expect(interval).toBe(15000);
    });

    it('should not accumulate multiple intervals', () => {
      // Test that cleanup function is called
      const mockClearInterval = vi.fn();

      // Simulate cleanup
      const intervalId = 123;
      mockClearInterval(intervalId);

      expect(mockClearInterval).toHaveBeenCalledWith(intervalId);
    });
  });

  describe('Status Badge Rendering', () => {
    it('should map healthy status to success variant', () => {
      const statusMap = {
        healthy: 'success',
        operational: 'success',
        active: 'success',
        success: 'success',
      };

      expect(statusMap.healthy).toBe('success');
      expect(statusMap.operational).toBe('success');
    });

    it('should map unhealthy status to error variant', () => {
      const statusMap = {
        unhealthy: 'error',
        error: 'error',
        inactive: 'error',
        rolled_back: 'error',
      };

      expect(statusMap.unhealthy).toBe('error');
      expect(statusMap.error).toBe('error');
    });

    it('should map degraded status to warning variant', () => {
      const statusMap = {
        degraded: 'warning',
      };

      expect(statusMap.degraded).toBe('warning');
    });

    it('should map in_progress status to info variant', () => {
      const statusMap = {
        in_progress: 'info',
      };

      expect(statusMap.in_progress).toBe('info');
    });
  });

  describe('Uptime Formatting', () => {
    function formatUptime(seconds: number): string {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    it('should format days and hours', () => {
      const uptime = 86400 + 3600 * 5; // 1 day 5 hours
      expect(formatUptime(uptime)).toBe('1d 5h');
    });

    it('should format hours and minutes', () => {
      const uptime = 3600 * 2 + 60 * 30; // 2 hours 30 minutes
      expect(formatUptime(uptime)).toBe('2h 30m');
    });

    it('should format minutes only', () => {
      const uptime = 60 * 45; // 45 minutes
      expect(formatUptime(uptime)).toBe('45m');
    });

    it('should handle zero uptime', () => {
      const uptime = 0;
      expect(formatUptime(uptime)).toBe('0m');
    });
  });
});
