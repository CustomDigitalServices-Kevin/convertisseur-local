import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../App";

describe("Shell", () => {
  it("renders the local-first banner", () => {
    render(<App />);
    expect(screen.getByTestId("local-banner")).toBeInTheDocument();
  });

  it("switches locale between FR and EN", async () => {
    const user = userEvent.setup();
    render(<App />);
    const initialTitle = screen.getByRole("heading", { level: 1 }).textContent;
    await user.click(screen.getByTestId("locale-toggle"));
    const toggledTitle = screen.getByRole("heading", { level: 1 }).textContent;
    expect(toggledTitle).not.toBe(initialTitle);
    expect(["Convertisseur local", "Local Converter"]).toContain(toggledTitle);
  });

  it("navigates to the privacy page and back", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Privacy & GDPR" }));
    expect(screen.getByRole("heading", { level: 1, name: "Privacy & GDPR" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to home" }));
    expect(screen.getByRole("heading", { level: 1, name: "Local Converter" })).toBeInTheDocument();
  });

  it("navigates to the licenses page and lists runtime dependencies", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Third-party licenses" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "Third-party licenses" }),
    ).toBeInTheDocument();
    expect(screen.getByText("react / react-dom")).toBeInTheDocument();
    expect(screen.getAllByText("MIT").length).toBeGreaterThan(0);
  });
});
