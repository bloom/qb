const shell = require("shelljs");
const git = require("./git");

let cfg = {
  field: git.getCurrentBranch(),
  workDir: Buffer.from(shell.pwd().stdout).toString("base64")
};

module.exports = cfg;
