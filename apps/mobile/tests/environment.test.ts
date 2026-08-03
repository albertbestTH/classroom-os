import { developmentEnvironmentLabel, getApiBaseUrl } from "@/lib/environment";

describe("mobile UAT environment contract", () => {
  const previousUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const previousLabel = process.env.EXPO_PUBLIC_ENV_LABEL;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previousUrl;
    if (previousLabel === undefined) delete process.env.EXPO_PUBLIC_ENV_LABEL;
    else process.env.EXPO_PUBLIC_ENV_LABEL = previousLabel;
  });

  it("accepts an HTTPS staging URL and exposes the configured UAT label", () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://staging.example.invalid/";
    process.env.EXPO_PUBLIC_ENV_LABEL = "UAT";
    expect(getApiBaseUrl()).toBe("https://staging.example.invalid");
    expect(developmentEnvironmentLabel()).toBe("UAT");
  });
});
