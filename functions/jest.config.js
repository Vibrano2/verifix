/** @type {import("jest").Config} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  modulePathIgnorePatterns: ["<rootDir>/lib/"],
  testMatch: ["**/__tests__/**/*.test.ts"]
};