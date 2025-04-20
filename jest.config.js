module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/src/tests/__mocks__/styleMock.js",
    "\\.(jpg|jpeg|png|gif|webp|svg)$":
      "<rootDir>/src/tests/__mocks__/fileMock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.js"],
  testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
};
