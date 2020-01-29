const { exec } = require("shelljs");
const fs = require("fs");

const pass_getter = `${__dirname}/bin/pass.js`;
module.exports.pass_getter = pass_getter;

module.exports.protect = path => {
  exec(`ansible-vault encrypt ${path} --vault-password-file ${pass_getter}`);
};

module.exports.expose = path => {
  exec(`ansible-vault decrypt ${path} --vault-password-file ${pass_getter}`);
};

module.exports.protect_string = path => {
  exec(
    `ansible-vault encrypt_string ${path} --vault-password-file ${pass_getter}`
  );
};

module.exports.show = path => {
  exec(`ansible-vault view ${path} --vault-password-file ${pass_getter}`);
};

module.exports.edit = path => {
  exec(`ansible-vault edit ${path} --vault-password-file ${pass_getter}`);
};
