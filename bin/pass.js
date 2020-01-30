#! /usr/bin/env node
const process = require("process");

try {
  const { exec } = require("shelljs");
  const fs = require("fs");
  const { cfg } = require("../config");
  const password = require("../password");

  let p = password.get_from_config();
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
