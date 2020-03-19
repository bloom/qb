const shell = require("shelljs");

module.exports.getCurrentBranch = () => {
  let gitBranch = shell
    .exec("git rev-parse --abbrev-ref HEAD", { silent: true })
    .stdout.trim();
  return gitBranch;
};

module.exports.isClean = () => {
  return (
    shell.exec("git status --porcelain", { silent: true }).stdout.trim() == ""
  );
};

module.exports.unpushed = () => {
  return shell.exec("git cherry -v", { silent: true }).stdout.trim();
};
