const { cfg } = require("./config");
const secure = require("./secure");
const { exec } = require("shelljs");
const fs = require("fs");

module.exports.show = () => {
  secure.show(`${cfg.field}/app_env`);
};

module.exports.edit = () => {
  secure.edit(`${cfg.field}/app_env`);
};

module.exports.set = (varName, varVal) => {
  let path = `${cfg.field}/app_env`;
  let newLine = `export ${varName}=${varVal}`;

  secure.expose(path);
  let lines = fs.readFileSync(path, { encoding: "utf-8" }).split("\n");

  var found = null;

  lines = lines.map(line => {
    if (line.toLowerCase().includes(varName.toLowerCase() + "=")) {
      // Replace the existing line if it is in the file.
      found = true;
      return newLine;
    } else {
      return line;
    }
  });

  if (!found) {
    // Add the line to the end if it's not already in the file.
    lines.push(newLine);
  }

  fs.writeFileSync(path, lines.join("\n"));
  secure.protect(path);
};
