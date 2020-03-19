#! /usr/bin/env node
const process = require("process");

try {
  const { exec } = require("shelljs");
  const fs = require("fs");
  const password = require("../password");
  const cfg = require("../config");

  let p = password.get(cfg.workDir, cfg.field);
  if (p == null) {
    console.error("No password found");
    process.exit(-1);
  } else {
    console.log(p.trim());
  }
} catch (e) {
  console.error("An unexpected error occurred", e);
  process.exit(-1);
}
