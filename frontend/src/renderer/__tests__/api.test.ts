import { describe, it, expect, vi, beforeEach } from "vitest";

const mockJson = vi.fn();
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ success: boolean; data: T | null; error?: { code: string; message: string } | null }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json();
    if (!res.ok && !body.success) {
      return { success: false, data: null, error: body.error ?? { code: "HTTP_ERROR", message: `Status ${res.status}` } };
    }
    return body as any;
  } catch {
    return { success: false, data: null, error: { code: "NETWORK_ERROR", message: "Network request failed" } };
  }
}

describe("fetchJson", () => {
  it("returns success on 2xx", async () => {
    mockJson.mockResolvedValue({ success: true, data: { id: 1, name: "test" }, error: null });
    mockFetch.mockResolvedValue({ ok: true, json: mockJson });

    const result = await fetchJson("/test");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: "test" });
  });

  it("returns body error on non-2xx with body.error", async () => {
    mockJson.mockResolvedValue({ error: { code: "NOT_FOUND", message: "Not found" } });
    mockFetch.mockResolvedValue({ ok: false, status: 404, json: mockJson });

    const result = await fetchJson("/test");
    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe("NOT_FOUND");
  });

  it("returns body error on non-2xx with body.success=false", async () => {
    mockJson.mockResolvedValue({ success: false, data: null, error: { code: "VALIDATION", message: "Bad input" } });
    mockFetch.mockResolvedValue({ ok: false, status: 422, json: mockJson });

    const result = await fetchJson("/test");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("VALIDATION");
  });

  it("returns HTTP_ERROR fallback when body has no .error and no .success", async () => {
    mockJson.mockResolvedValue({});
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: mockJson });

    const result = await fetchJson("/test");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("HTTP_ERROR");
    expect(result.error?.message).toBe("Status 500");
  });

  it("returns NETWORK_ERROR on fetch reject", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await fetchJson("/test");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NETWORK_ERROR");
  });
});
