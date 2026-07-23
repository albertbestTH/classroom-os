import * as SecureStore from "expo-secure-store";

import { deleteMobileSession, readMobileSession, saveMobileSession } from "@/lib/auth-storage";

jest.mock("expo-secure-store", () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "device-only",
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe("secure mobile session storage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("stores the offline session using device-only accessibility", async () => {
    await saveMobileSession({ token: "synthetic-token", expiresAt: "2030-01-01T00:00:00.000Z" });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "classroom-os.mobile-session",
      JSON.stringify({ token: "synthetic-token", expiresAt: "2030-01-01T00:00:00.000Z" }),
      { keychainAccessible: "device-only" },
    );
  });

  it("rejects malformed stored values and deletes the session", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce("not-json");
    await expect(readMobileSession()).resolves.toBeNull();
    await deleteMobileSession();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("classroom-os.mobile-session");
  });

  it("reads a valid token and expiry without exposing other stored fields", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValueOnce(JSON.stringify({
      token: "synthetic-token",
      expiresAt: "2030-01-01T00:00:00.000Z",
      password: "must-not-be-returned",
    }));
    await expect(readMobileSession()).resolves.toEqual({
      token: "synthetic-token",
      expiresAt: "2030-01-01T00:00:00.000Z",
    });
  });
});
