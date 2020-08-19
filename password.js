const process = require("process");
const { exec } = require("shelljs");
const { cfg } = require("./config");

module.exports.store = (field_name, app_name, vault_pass) => {
  exec(
    `security add-generic-password -U -a ${app_name}.${field_name} -s com.bloombuilt.qb -p ${vault_pass.trim()}`
  );
};

module.exports.get = (app_name, field) => {
  const pw =
    process.env.QB_PASS ||
    exec(
      `security find-generic-password -w -a ${app_name}.${field} -s com.bloombuilt.qb`,
      { silent: true }
    ).stdout;
  if (pw.trim() == "") {
    return null;
  } else {
    return pw.trim();
  }
};
