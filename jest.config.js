module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/src/tests/__mocks__/styleMock.js",
    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/tests/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.js"],
  testMatch: [
    "**/__tests__/**/*.{js,ts,tsx}",
    "**/?(*.)+(spec|test).{js,ts,tsx}",
  ],
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
};
