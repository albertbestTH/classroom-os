module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@classroom-os/types$": "<rootDir>/../../packages/types/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};
