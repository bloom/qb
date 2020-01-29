const { cfg } = require("./config");
const secure = require("./secure");

module.exports.show = () => {
  secure.show(`${cfg.field}/app_env`);
};

module.exports.edit = () => {
  secure.edit(`${cfg.field}/app_env`);
};
