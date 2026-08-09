import { afterEach, describe, expect, it } from "@jest/globals";

describe("urls", () => {
  const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;
  const ORIGINAL_ORIGIN = process.env.NEXT_PUBLIC_BACKEND_ORIGIN;

  afterEach(() => {
    if (ORIGINAL_API_URL === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
    }
    if (ORIGINAL_ORIGIN === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_ORIGIN = ORIGINAL_ORIGIN;
    }
    jest.resetModules();
  });

  it("defaults API_BASE_URL to /api when NEXT_PUBLIC_API_URL is unset", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
    const { API_BASE_URL, API_ORIGIN } = require("../urls");
    expect(API_BASE_URL).toBe("/api");
    expect(API_ORIGIN).toBe("http://localhost:8000");
  });

  it("honors NEXT_PUBLIC_API_URL and NEXT_PUBLIC_BACKEND_ORIGIN", () => {
    process.env.NEXT_PUBLIC_API_URL = "/securemed-api";
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN = "https://api.example.com";
    const { API_BASE_URL, API_ORIGIN } = require("../urls");
    expect(API_BASE_URL).toBe("/securemed-api");
    expect(API_ORIGIN).toBe("https://api.example.com");
  });
});
