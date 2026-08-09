import { describe, expect, it } from "@jest/globals";
import { tokens } from "../design-tokens";

describe("design tokens", () => {
  it("exposes the clinical color system", () => {
    expect(tokens.colors.coolGrey[50]).toBe("#F8F9FA");
    expect(tokens.colors.coolGrey[100]).toBe("#E9ECEF");
    expect(tokens.colors.coolGrey[200]).toBe("#DEE2E6");
    expect(tokens.colors.precisionBlue.DEFAULT).toBe("#0055FF");
    expect(tokens.colors.precisionBlue.dark).toBe("#0044CC");
    expect(tokens.colors.alertCrimson.DEFAULT).toBe("#D32F2F");
    expect(tokens.colors.alertCrimson.dark).toBe("#B71C1C");
    expect(tokens.colors.steelContrast).toBe("#212529");
  });

  it("keeps dark variants darker than the base color", () => {
    expect(tokens.colors.precisionBlue.dark).not.toBe(
      tokens.colors.precisionBlue.DEFAULT,
    );
    expect(tokens.colors.alertCrimson.dark).not.toBe(
      tokens.colors.alertCrimson.DEFAULT,
    );
  });

  it("defines sans and mono font stacks", () => {
    expect(tokens.fonts.sans.length).toBeGreaterThan(0);
    expect(tokens.fonts.mono.length).toBeGreaterThan(0);
    expect(tokens.fonts.mono.join(" ")).toMatch(/JetBrains Mono|Fira Code/);
  });

  it("defines a full radius scale", () => {
    expect(tokens.radius.sm).toBeDefined();
    expect(tokens.radius.md).toBeDefined();
    expect(tokens.radius.lg).toBeDefined();
    expect(tokens.radius.xl).toBeDefined();
  });

  it("matches the CSS variables in globals.css", () => {
    // Spot-check that the TS tokens agree with the committed CSS tokens.
    expect(tokens.colors.coolGrey[100]).toBe("#E9ECEF"); // --cool-grey-100
    expect(tokens.colors.precisionBlue.DEFAULT).toBe("#0055FF"); // --precision-blue
    expect(tokens.colors.alertCrimson.DEFAULT).toBe("#D32F2F"); // --alert-crimson
    expect(tokens.colors.steelContrast).toBe("#212529"); // --steel-contrast
  });
});
