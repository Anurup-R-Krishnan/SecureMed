import { beforeEach, describe, expect, it } from "@jest/globals";
import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { UnifiedApiClient } from "../unified-api-client";

const FAST_RETRY = {
  maxRetries: 3,
  initialDelayMs: 1,
  maxDelayMs: 10,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

function makeResponse(
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
  };
}

function makeError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
  code: string,
): AxiosError {
  return new AxiosError(
    `Request failed with status code ${status}`,
    code,
    config,
    undefined,
    {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    },
  );
}

describe("UnifiedApiClient", () => {
  beforeEach(() => {
    // The dedup cache is module-level and shared across instances/tests.
    new UnifiedApiClient(FAST_RETRY).clearCache();
  });

  it("returns data on success", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    await expect(
      client.get("/records", {
        adapter: async (config) => {
          calls += 1;
          return makeResponse(config, { id: 1, title: "Report" });
        },
      }),
    ).resolves.toEqual({ id: 1, title: "Report" });

    expect(calls).toBe(1);
  });

  it("posts the body on POST requests", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);

    await expect(
      client.post(
        "/records",
        { title: "New" },
        {
          adapter: async (config) =>
            makeResponse(config, { id: 2, title: "New" }, 201),
        },
      ),
    ).resolves.toEqual({ id: 2, title: "New" });
  });

  it("formats DRF {error} responses into ApiErrorResponse", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    const error = await client
      .get("/records", {
        adapter: async (config) => {
          calls += 1;
          throw makeError(config, 400, { error: "Bad request" }, "ERR_BAD_REQUEST");
        },
      })
      .catch((e) => e);

    expect(calls).toBe(1);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Bad request");
    expect(error.url).toBe("/records");
  });

  it("formats DRF {detail} responses", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);

    const error = await client
      .get("/records/99", {
        adapter: async (config) => {
          throw makeError(config, 404, { detail: "Not found" }, "ERR_BAD_REQUEST");
        },
      })
      .catch((e) => e);

    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
  });

  it("extracts the first field error from {errors} responses", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);

    const error = await client
      .post("/records", {}, {
        adapter: async (config) => {
          throw makeError(
            config,
            422,
            { errors: { email: ["Enter a valid email."] } },
            "ERR_BAD_REQUEST",
          );
        },
      })
      .catch((e) => e);

    expect(error.status).toBe(422);
    expect(error.message).toBe("Enter a valid email.");
    expect(error.details).toEqual({ email: ["Enter a valid email."] });
  });

  it("falls back to a generic message for unknown error shapes", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);

    const error = await client
      .get("/opaque", {
        adapter: async (config) => {
          throw makeError(config, 500, {}, "ERR_BAD_RESPONSE");
        },
      })
      .catch((e) => e);

    expect(error.status).toBe(500);
    expect(error.message).toBe("An unexpected error occurred");
  });

  it("does not retry non-retryable status codes (400/404/422)", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    await client
      .get("/records", {
        adapter: async (config) => {
          calls += 1;
          throw makeError(config, 422, { detail: "Validation failed" }, "ERR_BAD_REQUEST");
        },
      })
      .catch(() => {});

    expect(calls).toBe(1);
  });

  it("retries retryable 5xx errors and succeeds on a later attempt", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    await expect(
      client.get("/flaky", {
        adapter: async (config) => {
          calls += 1;
          if (calls === 1) {
            throw makeError(config, 503, {}, "ERR_BAD_RESPONSE");
          }
          return makeResponse(config, { recovered: true });
        },
      }),
    ).resolves.toEqual({ recovered: true });

    expect(calls).toBe(2);
  });

  it("treats network errors (no status) as retryable and eventually fails", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    const error = await client
      .get("/down", {
        adapter: async (config) => {
          calls += 1;
          throw new AxiosError("Network Error", "ERR_NETWORK", config);
        },
      })
      .catch((e) => e);

    // maxRetries 3 => 4 attempts, then the formatted error is surfaced
    expect(calls).toBe(4);
    expect(error.status).toBe(500);
    expect(error.message).toBe("Network Error");
  });

  it("deduplicates concurrent identical GET requests", async () => {
    const client = new UnifiedApiClient(FAST_RETRY);
    let calls = 0;

    const results = await Promise.all([
      client.get("/stats", {
        adapter: async (config) => {
          calls += 1;
          return makeResponse(config, { visits: 10 });
        },
      }),
      client.get("/stats", {
        adapter: async (config) => {
          calls += 1;
          return makeResponse(config, { visits: 10 });
        },
      }),
    ]);

    expect(results).toEqual([{ visits: 10 }, { visits: 10 }]);
    expect(calls).toBe(1);
  });
});
