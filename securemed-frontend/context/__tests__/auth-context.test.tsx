import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthProvider, useAuth } from "../auth-context";

// next/navigation, sonner, and the ToS modal are redirected to stubs in
// __mocks__ via jest.config.js moduleNameMapper (jest.mock factories do not
// apply reliably under next/jest's SWC transform).

const USER = {
  id: 1,
  username: "alice",
  email: "alice@securemed.io",
  role: "doctor",
  mfa_enabled: false,
};

function mockFetchResponse(body: unknown, ok = true) {
  return jest
    .fn<(url: string, init?: any) => Promise<any>>()
    .mockResolvedValue({
      ok,
      status: ok ? 200 : 401,
      text: async () => JSON.stringify(body),
    });
}

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn();
  });

  it("throws when used outside an AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
  });

  it("logs in successfully and persists tokens to localStorage", async () => {
    const fetchMock = mockFetchResponse({
      access: "acc-1",
      refresh: "ref-1",
      user: USER,
    });
    (global as any).fetch = fetchMock;

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login("alice", "secret");
    });

    expect(loginResult.status).toBe("SUCCESS");
    expect(loginResult.user.username).toBe("alice");
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("auth_tokens")).toContain("acc-1");
    expect(localStorage.getItem("auth_user")).toContain("alice");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login/"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns MFA_REQUIRED with a temp token when MFA is enabled", async () => {
    (global as any).fetch = mockFetchResponse({
      mfa_required: true,
      temp_token: "tmp-123",
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login("alice", "secret");
    });

    expect(loginResult.status).toBe("MFA_REQUIRED");
    expect(loginResult.tempToken).toBe("tmp-123");
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("auth_tokens")).toBeNull();
  });

  it("surfaces the server error message on failed login", async () => {
    (global as any).fetch = mockFetchResponse(
      { error: "Invalid credentials" },
      false,
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login("alice", "wrong");
    });

    expect(loginResult.status).toBe("SUCCESS");
    expect(loginResult.error).toBe("Invalid credentials");
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("auth_tokens")).toBeNull();
  });

  it("returns a network error message when the request fails", async () => {
    (global as any).fetch = jest
      .fn<(url: string, init?: any) => Promise<any>>()
      .mockRejectedValue(new Error("connection refused"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login("alice", "secret");
    });

    expect(loginResult.error).toBe("Network error. Please try again.");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("restores an existing session from localStorage on mount", async () => {
    localStorage.setItem(
      "auth_tokens",
      JSON.stringify({ access: "acc-old", refresh: "ref-old" }),
    );
    localStorage.setItem("auth_user", JSON.stringify(USER));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("alice");
  });

  it("clears local state on logout and marks post_logout_redirect", async () => {
    localStorage.setItem(
      "auth_tokens",
      JSON.stringify({ access: "acc-1", refresh: "ref-1" }),
    );
    localStorage.setItem("auth_user", JSON.stringify(USER));
    (global as any).fetch = mockFetchResponse({});

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("auth_tokens")).toBeNull();
    expect(localStorage.getItem("auth_user")).toBeNull();
    expect(localStorage.getItem("post_logout_redirect")).toBe("/");
  });
});
