import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserSection } from "@/components/settings/UserSection";

// Mock fetch
global.fetch = vi.fn();

describe("UserSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders user profile information", () => {
    render(<UserSection />);

    expect(screen.getByText("Benutzerkonto")).toBeInTheDocument();
    expect(screen.getByText("Profilinformationen")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Max Mustermann")).toBeInTheDocument();
    expect(screen.getByDisplayValue("max@sintra.ai")).toBeInTheDocument();
  });

  it("saves profile changes on blur", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<UserSection />);

    const nameInput = screen.getByDisplayValue("Max Mustermann");
    fireEvent.change(nameInput, { target: { value: "John Doe" } });
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings/user",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("John Doe"),
        })
      );
    });
  });

  it("shows 2FA setup dialog when button clicked", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ qrCode: "mock-qr-code" }),
    });

    render(<UserSection />);

    const setup2FAButton = screen.getByText("2FA einrichten");
    fireEvent.click(setup2FAButton);

    await waitFor(() => {
      expect(screen.getByText("Zwei-Faktor-Authentifizierung einrichten")).toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings/2fa",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("displays active sessions table", () => {
    render(<UserSection />);

    expect(screen.getByText("Aktive Sitzungen")).toBeInTheDocument();
    expect(screen.getByText("Chrome auf Windows")).toBeInTheDocument();
    expect(screen.getByText("Safari auf iPhone")).toBeInTheDocument();
    expect(screen.getByText("Aktuell")).toBeInTheDocument();
  });

  it("logs out individual session", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<UserSection />);

    const logoutButtons = screen.getAllByText("Abmelden");
    fireEvent.click(logoutButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/settings/sessions/sess-"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows confirmation before logging out all sessions", async () => {
    window.confirm = vi.fn(() => true);
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true }),
    });

    render(<UserSection />);

    const logoutAllButton = screen.getByText("Überall abmelden");
    fireEvent.click(logoutAllButton);

    expect(window.confirm).toHaveBeenCalledWith("Von allen Geräten abmelden?");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/settings/sessions",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("opens password change dialog", () => {
    render(<UserSection />);

    const passwordButton = screen.getByText("Passwort ändern");
    fireEvent.click(passwordButton);

    expect(screen.getByText("Aktuelles Passwort")).toBeInTheDocument();
    expect(screen.getByText("Neues Passwort")).toBeInTheDocument();
    expect(screen.getByText("Passwort bestätigen")).toBeInTheDocument();
  });
});
