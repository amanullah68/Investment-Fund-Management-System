// jest.config.js
export default {
  preset: "ts-jest/presets/default-esm", // ESM preset for NodeNext
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./tsconfig.json",
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testTimeout: 30000,
};
