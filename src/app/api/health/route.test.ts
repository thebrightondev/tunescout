import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns a healthy status payload", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload).toMatchObject({ status: "ok" });
    expect(typeof payload.uptime).toBe("number");
    expect(new Date(payload.timestamp).toString()).not.toBe("Invalid Date");
  });
});