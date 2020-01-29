const fs = require("fs");

module.exports.save = (app_name, field) => {
  fs.writeFileSync(".qb", JSON.stringify({ app_name, field }));
};

module.exports.load = () => {
  try {
    const stuff = fs.readFileSync(".qb", { encoding: "utf-8" });
    return JSON.parse(stuff);
  } catch (err) {
    return { app_name: null, field: null };
  }
};

module.exports.cfg = module.exports.load();
