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
    await user.click(screen.getByRole("button"));
    const toggledTitle = screen.getByRole("heading", { level: 1 }).textContent;
    expect(toggledTitle).not.toBe(initialTitle);
    expect(["Convertisseur local", "Local Converter"]).toContain(toggledTitle);
  });
});
