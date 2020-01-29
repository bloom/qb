#! /usr/bin/env node
const yargs = require("yargs");
const env = require("./env");
const prompts = require("prompts");
const config = require("./config");
const password = require("./password");
const shell = require("shelljs");
const secure = require("./secure");

const cfg = config.cfg;

async function create_field() {
  console.log(
    "Setting up a new field. It'll become the new active field for your project."
  );
  const response = await prompts([
    {
      type: "text",
      name: "field",
      message: "What's the name of the field? (e.g. staging)"
    },
    {
      type: "text",
      name: "app_name",
      message: "What's the name of this app?"
    },
    {
      type: "password",
      name: "password",
      message:
        "What password should we use for encrypting files? (Keep this in a password manager for later!)"
    }
  ]);
  config.save(response.app_name, response.field);
  password.store(response.field, response.app_name, response.password);

  const field = response.field;
  const app_name = response.app_name;
  // CREATE THE FILES!
  if (shell.test("-d", `${field}`)) {
    console.log(
      "A folder already exists with that field name. Skipping creation!"
    );
    process.exit(0);
  }

  shell.mkdir("-p", `${field}/vars`);
  shell.mkdir("-p", `${field}/files`);

  fs.writeFileSync(
    `${field}/vars/common.yml`,
    `app_name: ${app_name}\nenv: ${field}\n`
  );

  fs.writeFileSync(
    `${field}/infra.yml`,
    `# Write a playbook to set up actual cloud resources here!`
  );

  fs.writeFileSync(
    `${field}/provision.yml`,
    `# Write a playbook to provision your nifty new servers.`
  );

  fs.writeFileSync(
    `${field}/deploy.yml`,
    `# Write a playbook that deploys your code to freshly provisioned boxes!`
  );

  fs.writeFileSync(
    `${field}/app_env`,
    `# You'll want to copy this file to your servers and source it before running your apps.
     # Fill it with environment variables like this:
     # 
     # export NODE_ENV=${field}
     # 
     # It's automatically encrypted when it's stored in your code, so you can put
     # secrets in here.
    `
  );

  secure.protect(`${field}/app_env`);
}

async function switch_field(field_name) {
  if (!shell.test("-d", field_name)) {
    console.log(
      `Whoa, partner. I can't activate the field ${field_name} because that folder doesn't exist. Have you init'd it?`
    );
    process.exit(-1);
  }
  var app_name = cfg.app_name;
  if (app_name == null) {
    var response = await prompts({
      type: "text",
      name: "app_name",
      message:
        "Looks like we don't have an app set up for you yet. Please enter your app name!"
    });
    app_name = response.app_name;
  }
  if (password.get(app_name, field_name) == null) {
    var response = await prompts({
      type: "password",
      name: "password",
      message:
        "There isn't a password saved for this field yet. Please drop that thing here."
    });
    password.store(field_name, app_name, response.password);
  }
  console.log("Activating the field OOH YEAHH!");
  config.save(app_name, field_name);
}

async function init() {
  var response = await prompts({
    type: "select",
    name: "intent",
    message: "Hi! Want to create a new field? or activate an existing one? 🏈",
    choices: [
      { title: "create", value: "create" },
      { title: "activate", value: "activate" }
    ]
  });

  if (response.intent == "create") {
    await create_field();
  } else {
    var response = await prompts({
      type: "text",
      name: "name",
      message: "What's the name of the field you want to activate?"
    });
    await switch_field(response.name);
  }
}

function ensure_initted() {
  if (!cfg.app_name || !cfg.field) {
    console.log(`Yikes, looks like you don't have an app, or maybe an active field.
    Have you switched to an existing field or initted a new one yet?`);
    sys.exit(-1);
  }
  if (!password.get_from_config()) {
    print(`Looks like you don't have a password stored in the vault yet for this
    app and field. Try switching to the same field or running "qb init"`);
    sys.exit(-1);
  }
}

var argv = yargs
  .usage("Usage: $0 <command> [options]")
  .command("init", "Give QB the context it needs to get running")
  .command("field <operation>", "Create or switch active fields 🙌", yargs => {
    yargs.positional("operation", {
      choices: ["new", "switch"]
    });
  })
  .command(
    "env <operation>",
    "Easily work with the app environment for the active field.",
    yargs => {
      yargs
        .positional("operation", {
          choices: ["show", "edit"]
        })
        .example(
          "$0 env show",
          "Print out an unencrypted version of the app env."
        )
        .example(
          "$0 env edit",
          "Edit the app env, saving it in a safe, ecrypted form."
        );
    }
  )
  .command("run <playbook>", "Run a playbook!", yargs => {
    yargs.positional("playbook", {
      choices: ["infra", "provision", "deploy"]
    });
  })
  .command("edit <file>", "Edit an encrypted file.")
  .command("show <file>", "Print the contents of an encrypted file to stdout")
  .command("protect <file>", "Encrypt a file in-place")
  .command("protect_string <string>", "Encrypt a string and print the result")
  .command("expose <file>", "Decrypt a file in-place")
  .demandCommand(1)
  .help("h")
  .alias("h", "help").argv;

if (argv._[0] == "init") {
  init();
}

if (argv._[0] == "field" && argv.operation == "new") {
  create_field().catch(console.error.bind(this));
}

if (argv._[0] == "field" && argv.operation == "switch") {
  (async function() {
    var response = await prompts({
      type: "text",
      name: "name",
      message: "What's the name of the field you want to activate?"
    });
    switch_field(response.name).catch(console.error.bind(this));
  })().catch(console.error.bind(this));
}

if (argv._[0] == "run") {
  ensure_initted();
  shell.exec(
    `ANSIBLE_FORCE_COLOR=true ansible-playbook ${cfg.field}/${argv.playbook}.yml --vault-password-file ${secure.pass_getter}`
  );
}

if (argv._[0] == "env" && argv.operation == "show") {
  ensure_initted();
  env.show();
}

if (argv._[0] == "env" && argv.operation == "edit") {
  ensure_initted();
  env.edit();
}

if (argv._[0] == "edit") {
  ensure_initted();
  secure.edit(argv.file);
}

if (argv._[0] == "show") {
  ensure_initted();
  secure.show(argv.file);
}

if (argv._[0] == "protect") {
  ensure_initted();
  secure.protect(argv.file);
}

if (argv._[0] == "protect_string") {
  ensure_initted();
  secure.protect_string(argv.string);
}

if (argv._[0] == "expose") {
  ensure_initted();
  secure.expose(argv.string);
}
