"use strict";

module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: "> 0.25%, not dead"
      }
    ],
    "@babel/react",
    "@babel/preset-flow"
  ],
  plugins: [
    "@babel/plugin-transform-flow-comments",
    "@babel/plugin-proposal-class-properties"
  ],
  env: {
    test: {
      plugins: ["espower"]
    }
  }
};
