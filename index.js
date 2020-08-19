#! /usr/bin/env node
const yargs = require("yargs");
const env = require("./env");
const prompts = require("prompts");
const password = require("./password");
const shell = require("shelljs");
const fs = require("fs");
const secure = require("./secure");
const git = require("./git");
const cfg = require("./config");

async function create_field() {
  console.log(
    "Setting up a new field. It'll become the new active field for your project."
  );
  const response = await prompts([
    {
      type: "text",
      name: "field",
      message: "What's the name of the field? (e.g. staging)",
    },
    {
      type: "text",
      name: "app_name",
      message: "What's the name of this app?",
    },
    {
      type: "password",
      name: "password",
      message:
        "What password should we use for encrypting files? (Keep this in a password manager for later!)",
    },
  ]);
  password.store(response.field, cfg.workDir, response.password);

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
# secrets in here.`
  );

  secure.protect(`${field}/app_env`);

  fs.writeFileSync(`${field}/requirements.yml`, `# Add your requirements here`);
}

async function init() {
  var response = await prompts({
    type: "select",
    name: "intent",
    message: "Hi! Want to create a new field? or activate an existing one? 🏈",
    choices: [
      { title: "create", value: "create" },
      { title: "activate", value: "activate" },
    ],
  });

  if (response.intent == "create") {
    await create_field();
  } else {
    var response = await prompts({
      type: "text",
      name: "name",
      message: "What's the name of the field you want to activate?",
    });
    await switch_field(response.name);
  }
}

async function ensure_initted() {
  // Try to get the password.
  // If it's not there, ask for it.
  let pw = password.get(cfg.workDir, cfg.field);
  if (!pw) {
    console.log(
      `Looks like you don't have a password stored in the vault yet for this app and field.`
    );

    const response = await prompts([
      {
        type: "password",
        name: "password",
        message:
          "What password should we use for encrypting files? (Keep this in a password manager for later!)",
      },
    ]);

    password.store(cfg.field, cfg.workDir, response.password);
  }
}

var argv = yargs
  .usage("Usage: $0 <command> [options]")
  .command("init", "Give QB the context it needs to get running")
  .command(
    "field <operation>",
    "Create or switch active fields 🙌",
    (yargs) => {
      yargs.positional("operation", {
        choices: ["new"],
      });
    }
  )
  .command(
    "env <operation>",
    "Easily work with the app environment for the active field.",
    (yargs) => {
      yargs
        .positional("operation", {
          choices: ["show", "edit", "set"],
        })
        .example(
          "$0 env show",
          "Print out an unencrypted version of the app env."
        )
        .example(
          "$0 env edit",
          "Edit the app env, saving it in a safe, ecrypted form."
        )
        .example(
          "$0 env set NODE_ENV production",
          "Add or modify an environment variable in the encrypted app env."
        );
    }
  )
  .command("run <playbook>", "Run a playbook!", (yargs) => {
    yargs.positional("playbook", {
      choices: ["infra", "provision", "deploy"],
    });
  })
  .command(
    "ci",
    "Deploys to a field without any safety checks. Set your ENVs correctly!"
  )
  .command("edit <file>", "Edit an encrypted file.")
  .command("show <file>", "Print the contents of an encrypted file to stdout")
  .command("protect <file>", "Encrypt a file in-place")
  .command("protect_string <string>", "Encrypt a string and print the result")
  .command("expose <file>", "Decrypt a file in-place")
  .command(
    "install",
    "Installs roles from Ansible Galaxy listed in the field's requirements.yml file"
  )
  .demandCommand(1)
  .help("h")
  .alias("h", "help").argv;

async function main() {
  if (argv._[0] == "init") {
    init();
  }

  if (argv._[0] == "field" && argv.operation == "new") {
    create_field().catch(console.error.bind(this));
  }

  if (argv._[0] == "run") {
    await ensure_initted();
    let inventory = argv.playbook != "infra" ? `-i ${cfg.field}/inventory` : "";

    if (!argv.force) {
      if (argv.playbook == "deploy") {
        let isGitClean = git.isClean();
        shell.exec("git status --porcelain", { silent: true }).stdout.trim() ==
          "";
        if (!isGitClean) {
          console.log(
            "Looks like you have uncommited changes in your git repository. Please commit or stash all changes and run again."
          );
          process.exit(1);
        }

        let unpushedCommits = git.unpushed();
        if (unpushedCommits != "") {
          console.log(
            `It looks like you have local commits that you haven't yet pushed to the remote branch. Please do so before deploying.`
          );
          process.exit(1);
        }
      }
    }

    shell.exec(
      `ANSIBLE_FORCE_COLOR=true ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook ${cfg.field}/${argv.playbook}.yml --vault-password-file ${secure.pass_getter} ${inventory}`,
      { fatal: true }
    );
  }

  if (argv._[0] == "ci") {
    await ensure_initted();
    let inventory = `-i ${cfg.field}/inventory`;
    let r = shell.exec(
      `ANSIBLE_FORCE_COLOR=true ANSIBLE_HOST_KEY_CHECKING=false ansible-playbook ${cfg.field}/deploy.yml --vault-password-file ${secure.pass_getter} ${inventory}`,
      { fatal: true }
    );

    if (r.status != 0) {
      process.exit(-1);
    }
  }

  if (argv._[0] == "env" && argv.operation == "show") {
    await ensure_initted();
    env.show();
  }

  if (argv._[0] == "env" && argv.operation == "edit") {
    await ensure_initted();
    env.edit();
  }

  if (argv._[0] == "env" && argv.operation == "set") {
    await ensure_initted();
    let varName = argv._[1];
    let varVal = argv._[2];
    if (!varName || !varVal) {
      console.log(
        "You tried to set an env var without passing in the name or value of it! See qb env -h for an example."
      );
      process.exit(-1);
    }
    env.set(varName, varVal);
  }

  if (argv._[0] == "edit") {
    await ensure_initted();
    secure.edit(argv.file);
  }

  if (argv._[0] == "show") {
    await ensure_initted();
    secure.show(argv.file);
  }

  if (argv._[0] == "protect") {
    await ensure_initted();
    secure.protect(argv.file);
  }

  if (argv._[0] == "protect_string") {
    await ensure_initted();
    secure.protect_string(argv.string);
  }

  if (argv._[0] == "expose") {
    await ensure_initted();
    secure.expose(argv.file);
  }

  if (argv._[0] == "install") {
    await ensure_initted();
    shell.exec(`cd ${cfg.field} && ansible-galaxy install -r requirements.yml`);
  }
}

main().catch((err) => {
  throw err;
});
