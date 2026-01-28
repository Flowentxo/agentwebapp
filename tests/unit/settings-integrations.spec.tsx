import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { IntegrationsSection } from "@/components/settings/IntegrationsSection";

// Mock fetch
global.fetch = vi.fn();

describe("IntegrationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders integration cards", () => {
    render(<IntegrationsSection />);

    expect(screen.getByText("Integrationen")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Vercel")).toBeInTheDocument();
    expect(screen.getByText("Sentry")).toBeInTheDocument();
  });

  it("displays correct connection status badges", () => {
    render(<IntegrationsSection />);

    const verbundenBadges = screen.getAllByText("Verbunden");
    const nichtVerbundenBadges = screen.getAllByText("Nicht verbunden");

    expect(verbundenBadges).toHaveLength(2); // Slack, GitHub
    expect(nichtVerbundenBadges).toHaveLength(2); // Vercel, Sentry
  });

  it("connects integration when button clicked", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<IntegrationsSection />);

    const connectButtons = screen.getAllByText("Verbinden");
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/settings/integrations/"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("disconnects integration with confirmation", async () => {
    window.confirm = vi.fn(() => true);
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<IntegrationsSection />);

    const disconnectButtons = screen.getAllByText("Trennen");
    fireEvent.click(disconnectButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith("Integration wirklich trennen?");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/settings/integrations/"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("cancels disconnect when confirmation declined", async () => {
    window.confirm = vi.fn(() => false);

    render(<IntegrationsSection />);

    const disconnectButtons = screen.getAllByText("Trennen");
    fireEvent.click(disconnectButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows reauthorize button for connected integrations", () => {
    render(<IntegrationsSection />);

    const reauthorizeButtons = screen.getAllByText("Neu autorisieren");
    expect(reauthorizeButtons.length).toBeGreaterThan(0);
  });

  it("updates UI after successful connection", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<IntegrationsSection />);

    const connectButtons = screen.getAllByText("Verbinden");
    const initialCount = connectButtons.length;

    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      const updatedConnectButtons = screen.queryAllByText("Verbinden");
      expect(updatedConnectButtons.length).toBeLessThan(initialCount);
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(<IntegrationsSection />);

    const connectButtons = screen.getAllByText("Verbinden");
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to connect:",
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it("displays integration descriptions", () => {
    render(<IntegrationsSection />);

    expect(screen.getByText("Team-Kommunikation und Benachrichtigungen")).toBeInTheDocument();
    expect(screen.getByText("Code-Repository und CI/CD")).toBeInTheDocument();
    expect(screen.getByText("Deployment und Hosting")).toBeInTheDocument();
    expect(screen.getByText("Error Tracking und Monitoring")).toBeInTheDocument();
  });
});
