import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  getAccessToken,
  getAuthHeader,
  getCurrentUser,
  getRefreshToken,
  isAuthenticated,
  parseJSON,
} from "../auth-utils";

describe("auth-utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("parseJSON", () => {
    it("returns null for empty input", () => {
      expect(parseJSON(null)).toBeNull();
      expect(parseJSON("")).toBeNull();
    });

    it("parses valid JSON", () => {
      expect(parseJSON('{"access":"abc"}')).toEqual({ access: "abc" });
    });

    it("returns null for corrupt JSON", () => {
      expect(parseJSON("{not json")).toBeNull();
    });
  });

  describe("getAccessToken / getRefreshToken", () => {
    it("returns null when nothing is stored", () => {
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it("reads tokens from the auth_tokens blob", () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "acc-1", refresh: "ref-1" }),
      );
      expect(getAccessToken()).toBe("acc-1");
      expect(getRefreshToken()).toBe("ref-1");
    });

    it("returns null for a corrupt auth_tokens blob", () => {
      localStorage.setItem("auth_tokens", "not-json");
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });

    it("returns null when access token is missing", () => {
      localStorage.setItem("auth_tokens", JSON.stringify({ refresh: "ref-1" }));
      expect(getAccessToken()).toBeNull();
      expect(getRefreshToken()).toBe("ref-1");
    });
  });

  describe("isAuthenticated", () => {
    it("is false without tokens", () => {
      expect(isAuthenticated()).toBe(false);
    });

    it("is true with an access token", () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "acc-1", refresh: "ref-1" }),
      );
      expect(isAuthenticated()).toBe(true);
    });

    it("is false when only a refresh token exists", () => {
      localStorage.setItem("auth_tokens", JSON.stringify({ refresh: "ref-1" }));
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe("getAuthHeader", () => {
    it("returns null without a token", () => {
      expect(getAuthHeader()).toBeNull();
    });

    it("builds a Bearer header from the access token", () => {
      localStorage.setItem(
        "auth_tokens",
        JSON.stringify({ access: "jwt-abc", refresh: "ref-1" }),
      );
      expect(getAuthHeader()).toBe("Bearer jwt-abc");
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when no user is stored", () => {
      expect(getCurrentUser()).toBeNull();
    });

    it("returns the parsed user", () => {
      const user = { id: 1, username: "alice", email: "a@x.io", role: "doctor" };
      localStorage.setItem("auth_user", JSON.stringify(user));
      expect(getCurrentUser()).toEqual(user);
    });

    it("returns null for a corrupt user blob", () => {
      localStorage.setItem("auth_user", "corrupt{");
      expect(getCurrentUser()).toBeNull();
    });
  });
});
