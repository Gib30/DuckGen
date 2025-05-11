const chalk = require("chalk");
const readline = require("readline");
const { execSync } = require("child_process");
const fs = require("fs");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const log = (msg) => console.log(chalk.cyan(`[DuckGen] `) + msg);
const error = (msg) => console.error(chalk.red(`❌ Error: ${msg}`));
const success = (msg) => console.log(chalk.green(`✅ ${msg}`));

const menu = chalk.bold(`
DuckGen CLI
------------------------------
[1] Run Trait Mixer
[2] Render NFTs
[3] Run Tests
[4] View Last Render Log
[5] Exit
`);

function runCommand(cmd, label) {
  try {
    log(`Running ${label}...`);
    execSync(cmd, { stdio: "inherit" });
    success(`${label} completed.\n`);
  } catch (err) {
    error(`${label} failed.`);
  }
}

function viewLog(filePath, fallback) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    console.log(chalk.gray(`\n--- ${filePath} ---\n`));
    console.log(data.slice(0, 2000));
    if (data.length > 2000) console.log(chalk.gray("\n...truncated"));
  } catch {
    console.log(chalk.yellow(fallback));
  }
}

function showMenu() {
  console.clear();
  console.log(menu);
  rl.question(chalk.yellow("Select an option: "), (answer) => {
    switch (answer.trim()) {
      case "1":
        runCommand("npm run traitmix", "Trait Mixer");
        return showMenu();
      case "2":
        rl.question(chalk.yellow("Limit render? Enter number or press enter: "), (limit) => {
          const cmd = limit.trim() ? `node scripts/render.js --limit ${limit}` : "npm run render";
          runCommand(cmd, "Render NFTs");
          showMenu();
        });
        break;
      case "3":
        runCommand("npm test", "Test Suite");
        return showMenu();
      case "4":
        viewLog("./output/render_log.txt", "No render log found.");
        return rl.question(chalk.yellow("\nPress enter to return to menu..."), () => showMenu());
      case "5":
        log("Goodbye!");
        rl.close();
        break;
      default:
        error("Invalid option.");
        setTimeout(showMenu, 1000);
    }
  });
}

showMenu();
