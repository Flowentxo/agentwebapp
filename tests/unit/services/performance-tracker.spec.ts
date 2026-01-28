/**
 * Performance Tracker Service Tests
 *
 * Tests for performance monitoring and metrics collection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    execute: vi.fn().mockResolvedValue([]),
  }),
}));

// Import after mocking
import { PerformanceTracker } from "@/lib/monitoring/performance-tracker";

describe("Performance Tracker", () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    // Get fresh instance for each test
    tracker = PerformanceTracker.getInstance();
  });

  afterEach(() => {
    // Cleanup
    tracker.cleanup();
  });

  describe("track", () => {
    it("should track a basic metric", () => {
      tracker.track({
        type: "api",
        name: "GET /test",
        duration: 100,
        status: "success",
      });

      const recent = tracker.getRecentMetrics("api", 10);
      expect(recent.length).toBeGreaterThan(0);

      const metric = recent[0];
      expect(metric.type).toBe("api");
      expect(metric.name).toBe("GET /test");
      expect(metric.duration).toBe(100);
      expect(metric.status).toBe("success");
    });

    it("should include metadata", () => {
      tracker.track({
        type: "database",
        name: "SELECT query",
        duration: 50,
        status: "success",
        metadata: { rowCount: 100 },
      });

      const recent = tracker.getRecentMetrics("database", 10);
      expect(recent[0].metadata).toEqual({ rowCount: 100 });
    });

    it("should track errors with messages", () => {
      tracker.track({
        type: "api",
        name: "POST /fail",
        duration: 200,
        status: "error",
        errorMessage: "Connection refused",
      });

      const recent = tracker.getRecentMetrics("api", 10);
      const errorMetric = recent.find((m) => m.status === "error");

      expect(errorMetric).toBeDefined();
      expect(errorMetric?.errorMessage).toBe("Connection refused");
    });
  });

  describe("trackAPI", () => {
    it("should track API calls with correct format", () => {
      tracker.trackAPI("/api/users", "GET", 150, "success", 200);

      const recent = tracker.getRecentMetrics("api", 10);
      const metric = recent.find((m) => m.name === "GET /api/users");

      expect(metric).toBeDefined();
      expect(metric?.metadata?.method).toBe("GET");
      expect(metric?.metadata?.endpoint).toBe("/api/users");
      expect(metric?.metadata?.statusCode).toBe(200);
    });
  });

  describe("trackDatabase", () => {
    it("should track database queries", () => {
      tracker.trackDatabase("SELECT * FROM users", 25, "success", 50);

      const recent = tracker.getRecentMetrics("database", 10);
      expect(recent.length).toBeGreaterThan(0);
      expect(recent[0].name).toContain("SELECT");
    });

    it("should truncate long queries", () => {
      const longQuery = "SELECT ".padEnd(200, "x");
      tracker.trackDatabase(longQuery, 100, "success");

      const recent = tracker.getRecentMetrics("database", 10);
      expect(recent[0].name.length).toBeLessThanOrEqual(100);
    });
  });

  describe("trackAgent", () => {
    it("should track agent executions", () => {
      tracker.trackAgent("dexter", 5000, "success", 1500);

      const recent = tracker.getRecentMetrics("agent", 10);
      const metric = recent.find((m) => m.name === "dexter");

      expect(metric).toBeDefined();
      expect(metric?.metadata?.tokensUsed).toBe(1500);
    });
  });

  describe("trackWorkflow", () => {
    it("should track workflow executions", () => {
      tracker.trackWorkflow("workflow-123", 10000, "success", 5);

      const recent = tracker.getRecentMetrics("workflow", 10);
      const metric = recent.find((m) => m.name === "workflow-123");

      expect(metric).toBeDefined();
      expect(metric?.metadata?.stepsCompleted).toBe(5);
    });
  });

  describe("trackCache", () => {
    it("should track cache operations", () => {
      tracker.trackCache("hit", "user:123", 2);
      tracker.trackCache("miss", "user:456", 5);

      const recent = tracker.getRecentMetrics("cache", 10);
      expect(recent.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("startTimer", () => {
    it("should measure elapsed time", async () => {
      const endTimer = tracker.startTimer();

      // Wait 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));

      const duration = endTimer();
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(200);
    });
  });

  describe("getRecentMetrics", () => {
    it("should filter by type", () => {
      tracker.track({ type: "api", name: "test1", duration: 100, status: "success" });
      tracker.track({ type: "database", name: "test2", duration: 50, status: "success" });
      tracker.track({ type: "api", name: "test3", duration: 200, status: "success" });

      const apiMetrics = tracker.getRecentMetrics("api", 100);
      const dbMetrics = tracker.getRecentMetrics("database", 100);

      expect(apiMetrics.every((m) => m.type === "api")).toBe(true);
      expect(dbMetrics.every((m) => m.type === "database")).toBe(true);
    });

    it("should respect limit", () => {
      for (let i = 0; i < 20; i++) {
        tracker.track({
          type: "api",
          name: `test-${i}`,
          duration: 100,
          status: "success",
        });
      }

      const limited = tracker.getRecentMetrics("api", 5);
      expect(limited.length).toBeLessThanOrEqual(5);
    });

    it("should return most recent first", () => {
      tracker.track({ type: "api", name: "first", duration: 100, status: "success" });
      tracker.track({ type: "api", name: "second", duration: 100, status: "success" });

      const recent = tracker.getRecentMetrics("api", 10);
      expect(recent[0].name).toBe("second");
    });
  });

  describe("getAggregatedMetrics", () => {
    beforeEach(() => {
      // Add some test metrics
      for (let i = 0; i < 10; i++) {
        tracker.track({
          type: "api",
          name: "GET /users",
          duration: 100 + i * 10,
          status: i < 8 ? "success" : "error",
        });
      }
    });

    it("should calculate count correctly", () => {
      const aggregated = tracker.getAggregatedMetrics("api", 60);
      const metric = aggregated.find((m) => m.name === "GET /users");

      expect(metric?.count).toBe(10);
    });

    it("should calculate average duration", () => {
      const aggregated = tracker.getAggregatedMetrics("api", 60);
      const metric = aggregated.find((m) => m.name === "GET /users");

      // Average of 100, 110, 120, ..., 190 = 145
      expect(metric?.avgDuration).toBe(145);
    });

    it("should calculate min and max", () => {
      const aggregated = tracker.getAggregatedMetrics("api", 60);
      const metric = aggregated.find((m) => m.name === "GET /users");

      expect(metric?.minDuration).toBe(100);
      expect(metric?.maxDuration).toBe(190);
    });

    it("should calculate error rate", () => {
      const aggregated = tracker.getAggregatedMetrics("api", 60);
      const metric = aggregated.find((m) => m.name === "GET /users");

      expect(metric?.errorRate).toBe(0.2); // 2 errors out of 10
    });
  });

  describe("getSystemHealth", () => {
    it("should return health status", () => {
      const health = tracker.getSystemHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("uptime");
      expect(health).toHaveProperty("memory");
      expect(health).toHaveProperty("errorRate");
      expect(health).toHaveProperty("avgResponseTime");
    });

    it("should report healthy status with no errors", () => {
      // Track some successful operations
      for (let i = 0; i < 10; i++) {
        tracker.track({
          type: "api",
          name: "test",
          duration: 100,
          status: "success",
        });
      }

      const health = tracker.getSystemHealth();
      expect(health.status).toBe("healthy");
    });

    it("should report degraded status with some errors", () => {
      // Track mix of success and errors (>5% error rate)
      for (let i = 0; i < 90; i++) {
        tracker.track({
          type: "api",
          name: "test",
          duration: 100,
          status: "success",
        });
      }
      for (let i = 0; i < 10; i++) {
        tracker.track({
          type: "api",
          name: "test",
          duration: 100,
          status: "error",
        });
      }

      const health = tracker.getSystemHealth();
      expect(["degraded", "unhealthy"]).toContain(health.status);
    });
  });

  describe("getSlowOperations", () => {
    beforeEach(() => {
      tracker.track({ type: "api", name: "fast", duration: 100, status: "success" });
      tracker.track({ type: "api", name: "slow1", duration: 2000, status: "success" });
      tracker.track({ type: "api", name: "slow2", duration: 3000, status: "success" });
      tracker.track({ type: "api", name: "medium", duration: 500, status: "success" });
    });

    it("should filter by threshold", () => {
      const slow = tracker.getSlowOperations(1000);

      expect(slow.length).toBe(2);
      expect(slow.every((m) => m.duration >= 1000)).toBe(true);
    });

    it("should sort by duration descending", () => {
      const slow = tracker.getSlowOperations(1000);

      expect(slow[0].duration).toBeGreaterThan(slow[1].duration);
    });

    it("should respect limit", () => {
      const slow = tracker.getSlowOperations(1000, 1);
      expect(slow.length).toBe(1);
    });
  });

  describe("getErrorSummary", () => {
    beforeEach(() => {
      tracker.track({ type: "api", name: "err1", duration: 100, status: "error", errorMessage: "Timeout" });
      tracker.track({ type: "api", name: "err2", duration: 100, status: "error" });
      tracker.track({ type: "database", name: "err3", duration: 100, status: "error" });
      tracker.track({ type: "api", name: "ok", duration: 100, status: "success" });
    });

    it("should count total errors", () => {
      const summary = tracker.getErrorSummary(60);
      expect(summary.total).toBe(3);
    });

    it("should group errors by type", () => {
      const summary = tracker.getErrorSummary(60);

      expect(summary.byType.api).toBe(2);
      expect(summary.byType.database).toBe(1);
    });

    it("should return recent errors", () => {
      const summary = tracker.getErrorSummary(60);

      expect(summary.recentErrors.length).toBe(3);
      expect(summary.recentErrors.every((e) => e.status === "error")).toBe(true);
    });
  });
});
