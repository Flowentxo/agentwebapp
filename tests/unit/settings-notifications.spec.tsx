import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationsSection } from "@/components/settings/NotificationsSection";

// Mock fetch
global.fetch = vi.fn();

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders notification settings", () => {
    render(<NotificationsSection />);

    expect(screen.getByText("Benachrichtigungen")).toBeInTheDocument();
    expect(screen.getByText("Systemwarnungen")).toBeInTheDocument();
    expect(screen.getByText("Deployments")).toBeInTheDocument();
    expect(screen.getByText("Incidents")).toBeInTheDocument();
    expect(screen.getByText("Sicherheitsmeldungen")).toBeInTheDocument();
  });

  it("displays correct initial toggle states", () => {
    render(<NotificationsSection />);

    const switches = screen.getAllByRole("switch");
    switches.forEach((switchEl) => {
      expect(switchEl).toHaveAttribute("aria-checked", "true");
    });
  });

  it("toggles notification setting and persists to API", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<NotificationsSection />);

    const systemAlertsSwitch = screen.getByLabelText("Systemwarnungen aktivieren");
    fireEvent.click(systemAlertsSwitch);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings/notifications",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"systemAlerts":false'),
        })
      );
    });
  });

  it("handles multiple toggle changes independently", async () => {
    (global.fetch as any).mockResolvedValue({
      json: async () => ({ success: true }),
    });

    render(<NotificationsSection />);

    const deploymentsSwitch = screen.getByLabelText("Deployments aktivieren");
    const securitySwitch = screen.getByLabelText("Sicherheitsmeldungen aktivieren");

    fireEvent.click(deploymentsSwitch);
    fireEvent.click(securitySwitch);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it("handles API errors gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(<NotificationsSection />);

    const incidentsSwitch = screen.getByLabelText("Incidents aktivieren");
    fireEvent.click(incidentsSwitch);

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to save notification settings:",
        expect.any(Error)
      );
    });

    consoleError.mockRestore();
  });

  it("displays notification descriptions", () => {
    render(<NotificationsSection />);

    expect(
      screen.getByText("Benachrichtigungen über Systemstatus und Wartungen")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Erfolgreiche und fehlgeschlagene Deployments")
    ).toBeInTheDocument();
    expect(screen.getByText("Kritische Fehler und Ausfälle")).toBeInTheDocument();
    expect(
      screen.getByText("Verdächtige Aktivitäten und Zugriffe")
    ).toBeInTheDocument();
  });
});
