import { apiRequest } from "@/lib/api-client";
import { MobileApiError } from "@/lib/api-error";

const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: jest.fn().mockResolvedValue(JSON.stringify(body)),
}) as unknown as Response;

describe("mobile API client", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:3000/";
    globalThis.fetch = jest.fn();
  });

  it("adds the bearer token and unwraps the API envelope", async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(200, { data: { id: "synthetic" } }));
    await expect(apiRequest<{ id: string }>("/api/example", { token: "opaque-token" })).resolves.toEqual({ id: "synthetic" });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/example", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer opaque-token" }),
    }));
  });

  it("retries a failed read once", async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(response(200, { data: "ok" }));
    await expect(apiRequest<string>("/api/example")).resolves.toBe("ok");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("never retries mutations", async () => {
    jest.mocked(fetch).mockRejectedValue(new Error("offline"));
    await expect(apiRequest("/api/example", { method: "POST", body: {} })).rejects.toMatchObject({ kind: "network" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("preserves safe server error codes", async () => {
    jest.mocked(fetch).mockResolvedValueOnce(response(409, { error: { code: "CONFLICT", message: "conflict" } }));
    await expect(apiRequest("/api/example")).rejects.toEqual(expect.objectContaining<Partial<MobileApiError>>({ code: "CONFLICT", status: 409 }));
  });

  it("fails clearly when the API base URL is missing", async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    await expect(apiRequest("/api/example")).rejects.toThrow("EXPO_PUBLIC_API_BASE_URL");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("classifies an aborted request as a timeout", async () => {
    jest.useFakeTimers();
    jest.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    }));
    const pending = apiRequest("/api/example", { timeoutMs: 10, retryReads: 0 });
    const assertion = expect(pending).rejects.toMatchObject({ kind: "timeout" });
    await jest.advanceTimersByTimeAsync(10);
    await assertion;
    jest.useRealTimers();
  });
});
