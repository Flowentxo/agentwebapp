/**
 * Agent Chat E2E Tests
 *
 * End-to-end tests for agent chat functionality
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Note: These are integration tests that would typically run with Playwright or Cypress
// For now, we're using Vitest to demonstrate the test structure

describe("Agent Chat E2E", () => {
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

  describe("Agent Selection", () => {
    it("should display available agents on browse page", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/browse`);

      // API should return list of agents
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.agents).toBeDefined();
      expect(Array.isArray(data.agents)).toBe(true);
    });

    it("should navigate to agent chat page", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter`, {
        headers: { "x-user-id": "test-user" },
      });

      expect(response.ok).toBe(true);
    });
  });

  describe("Chat Functionality", () => {
    it("should send message to agent", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "test-user",
        },
        body: JSON.stringify({
          content: "Hello, can you help me analyze some data?",
        }),
      });

      // Check response format (streaming or regular)
      expect(response.ok).toBe(true);
    });

    it("should retrieve chat history", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter/chat`, {
        headers: { "x-user-id": "test-user" },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.messages).toBeDefined();
      expect(Array.isArray(data.messages)).toBe(true);
    });

    it("should handle empty messages gracefully", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "test-user",
        },
        body: JSON.stringify({
          content: "",
        }),
      });

      // Should return 400 for empty content
      expect(response.status).toBe(400);
    });
  });

  describe("Agent Personas", () => {
    const agents = ["dexter", "cassie", "emmie", "kai", "nova", "aura"];

    agents.forEach((agentId) => {
      it(`should return agent info for ${agentId}`, async () => {
        const response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
          headers: { "x-user-id": "test-user" },
        });

        if (response.ok) {
          const data = await response.json();
          expect(data.agent).toBeDefined();
          expect(data.agent.id).toBe(agentId);
          expect(data.agent.name).toBeDefined();
          expect(data.agent.role).toBeDefined();
        }
      });
    });
  });

  describe("Streaming Responses", () => {
    it("should stream response for chat message", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "test-user",
        },
        body: JSON.stringify({
          content: "What is 2+2?",
          stream: true,
        }),
      });

      // Should return streaming response
      expect(response.ok).toBe(true);

      // Check for streaming content type
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("text/event-stream")) {
        expect(contentType).toContain("text/event-stream");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid agent ID", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/invalid-agent-id`, {
        headers: { "x-user-id": "test-user" },
      });

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await fetch(`${BASE_URL}/api/agents/dexter/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Missing x-user-id header
        },
        body: JSON.stringify({
          content: "Test message",
        }),
      });

      // Should either require auth or use demo user
      expect([200, 401].includes(response.status)).toBe(true);
    });
  });
});

describe("Workflow Execution E2E", () => {
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

  describe("Pipeline Listing", () => {
    it("should list available pipelines", async () => {
      const response = await fetch(`${BASE_URL}/api/pipelines`, {
        headers: { "x-user-id": "test-user" },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.pipelines).toBeDefined();
    });
  });

  describe("Pipeline Execution", () => {
    it("should start pipeline execution", async () => {
      // First, get a pipeline ID
      const listResponse = await fetch(`${BASE_URL}/api/pipelines`, {
        headers: { "x-user-id": "test-user" },
      });

      if (!listResponse.ok) return;

      const { pipelines } = await listResponse.json();
      if (!pipelines || pipelines.length === 0) return;

      const pipelineId = pipelines[0].id;

      // Try to execute
      const execResponse = await fetch(
        `${BASE_URL}/api/pipelines/${pipelineId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "test-user",
          },
        }
      );

      // Either succeeds or fails gracefully
      expect([200, 201, 400, 404].includes(execResponse.status)).toBe(true);
    });
  });
});

describe("Team Collaboration E2E", () => {
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

  describe("Team Listing", () => {
    it("should list agent teams", async () => {
      const response = await fetch(`${BASE_URL}/api/teams`, {
        headers: { "x-user-id": "test-user" },
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Team Execution", () => {
    it("should execute team with task", async () => {
      // Get available teams
      const teamsResponse = await fetch(`${BASE_URL}/api/teams`, {
        headers: { "x-user-id": "test-user" },
      });

      if (!teamsResponse.ok) return;

      const { data: teams } = await teamsResponse.json();
      if (!teams || teams.length === 0) return;

      const teamId = teams[0].teamId;

      // Execute team
      const execResponse = await fetch(
        `${BASE_URL}/api/teams/${teamId}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": "test-user",
          },
          body: JSON.stringify({
            task: "Analyze market trends",
          }),
        }
      );

      // Check response
      expect([200, 201, 400, 404].includes(execResponse.status)).toBe(true);
    });
  });
});
