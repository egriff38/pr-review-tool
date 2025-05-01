#!/usr/bin/env node

import { program, Option } from "commander";
import fs from "fs";
import path from "path";
import { execSync, exec } from "child_process";
import readline from "readline/promises";
import os from "os";
import { URL } from "url";
import open from "open";

// Read version from package.json
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
);
const VERSION = packageJson.version;

const CONFIG_FILE_NAME = ".pr-review-tool.config.json";
// Helper function to expand ~ to home directory
function expandHomeDir(path: string): string {
  return path.replace(/^~(?=$|\/|\\)/, os.homedir());
}

// Define interface for the configuration
interface Config {
  searchDirs: string[];
  defaultSessionDuration: number;
}

// Read configuration from the dotfile
function readConfig(): Config {
  const defaultConfig: Config = {
    searchDirs: [process.cwd()], // Default to current directory
    defaultSessionDuration: 25, // Default pomodoro session duration in minutes
  };

  const configPath = path.join(os.homedir(), CONFIG_FILE_NAME);

  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf8");
      const userConfig = JSON.parse(configContent);
      // Expand ~ in search directories
      if (userConfig.searchDirs) {
        userConfig.searchDirs = userConfig.searchDirs.map(expandHomeDir);
      }
      return { ...defaultConfig, ...userConfig };
    }
  } catch (error) {
    console.error("Error reading config file:", error);
  }

  return defaultConfig;
}

// Parse GitHub URL to extract owner and repo
function parseGitHubUrl(
  url: string
): { owner: string; repo: string; prNumber: string } | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.includes("github.com")) {
      throw new Error("Not a GitHub URL");
    }

    const pathParts = parsedUrl.pathname.split("/");

    // Handle different URL formats
    // Typical format: https://github.com/owner/repo/pull/123
    if (pathParts.length >= 5 && pathParts[3] === "pull") {
      return {
        owner: pathParts[1],
        repo: pathParts[2],
        prNumber: pathParts[4],
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Find a local repository that has the GitHub repo as a remote
async function findLocalRepo(
  owner: string,
  repo: string,
  searchDirs: string[],
  verbose: boolean = false
): Promise<string | null> {
  // Expand ~ in search directories
  searchDirs = searchDirs.map(expandHomeDir);

  if (verbose) {
    console.log(`\nSearching for local repository for ${owner}/${repo}...`);
    console.log(`Search directories: ${searchDirs.join(", ")}`);
  }

  const targetRemote = `github.com[:/]${owner}/${repo}`;

  for (const baseDir of searchDirs) {
    if (verbose) {
      console.log(`\nScanning directory: ${baseDir}`);
    }

    try {
      // Make sure the directory exists
      if (!fs.existsSync(baseDir)) {
        if (verbose) {
          console.log(`Directory does not exist: ${baseDir}`);
        }
        continue;
      }

      // Get all subdirectories
      const dirs = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => path.join(baseDir, dirent.name));

      if (verbose) {
        console.log(`Found ${dirs.length} subdirectories to scan`);
      }

      for (const dir of dirs) {
        const gitDir = path.join(dir, ".git");
        if (!fs.existsSync(gitDir)) {
          if (verbose) {
            console.log(`Skipping non-git directory: ${dir}`);
          }
          continue;
        }

        if (verbose) {
          console.log(`\nChecking git repository: ${dir}`);
        }

        // Check if this repository has the target remote
        try {
          const remotes = execSync("git remote -v", {
            cwd: dir,
            encoding: "utf8",
          });
          const regex = new RegExp(targetRemote);

          if (verbose) {
            console.log("Found remotes:");
            console.log(remotes);
          }

          if (regex.test(remotes)) {
            console.log(`\n✅ Found repository at ${dir}`);
            return dir;
          } else if (verbose) {
            console.log("No matching remote found in this repository");
          }
        } catch (error) {
          if (verbose) {
            console.log(`Error checking remotes: ${error}`);
          }
          // Skip this directory if git command fails
          continue;
        }
      }
    } catch (error) {
      if (verbose) {
        console.warn(`Error scanning directory ${baseDir}:`, error);
      }
    }
  }

  if (verbose) {
    console.log("\n❌ No matching repository found in any search directory");
  }
  return null;
}

// Check if GitHub CLI is installed
function checkGhCli(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

// Check out the PR using GitHub CLI
function checkoutPR(repoPath: string, prNumber: string): boolean {
  try {
    console.log(`Checking out PR #${prNumber}...`);
    execSync(`gh pr checkout ${prNumber}`, { cwd: repoPath, stdio: "inherit" });
    return true;
  } catch (error) {
    console.error("Failed to check out PR:", error);
    return false;
  }
}

// Ask the user if they want to open the editor
async function promptOpenEditor(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question("Open in editor? [Y]es/[n]o/new [w]indow: ");
  rl.close();
  return answer.toLowerCase();
}

// Open the repository in VSCode
function openInVSCode(repoPath: string, newWindow: boolean = false): void {
  const command = newWindow ? "code" : "code -r";

  try {
    exec(`${command} ${repoPath}`, (error) => {
      if (error) {
        console.error("Failed to open VSCode:", error);
      }
    });
  } catch (error) {
    console.error("Failed to execute VSCode command:", error);
  }
}

// Start a pomodoro session timer
function startSessionTimer(prUrl: string, duration: number): void {
  try {
    // Format the URL for the session timer
    const sessionIntent = `Review ${prUrl}`;
    const sessionCategory = "PR-Review";
    const sessionNotes = `PR Review for ${prUrl}`;

    const sessionUrl = `session:///start?intent=${encodeURIComponent(
      sessionIntent
    )}&duration=${duration}&categoryName=${encodeURIComponent(
      sessionCategory
    )}&notes=${encodeURIComponent(sessionNotes)}`;

    console.log(`Starting session timer (${duration} minutes)...`);
    open(sessionUrl);
  } catch (error) {
    console.error("Failed to start session timer:", error);
  }
}

// Main function
async function main(prUrl: string, options: any): Promise<void> {
  // Validate GitHub URL
  const prInfo = parseGitHubUrl(prUrl);
  if (!prInfo) {
    console.error(
      "Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123"
    );
    process.exit(1);
  }

  const { owner, repo, prNumber } = prInfo;

  // Check if GitHub CLI is installed
  if (!checkGhCli()) {
    console.error(
      "GitHub CLI (gh) is not installed or not in PATH. Please install it first."
    );
    process.exit(1);
  }

  // Read config
  const config = readConfig();

  // Find local repository
  const repoPath = await findLocalRepo(
    owner,
    repo,
    config.searchDirs,
    options.verbose
  );
  if (!repoPath) {
    console.error(
      `Could not find a local repository for ${owner}/${repo} in configured search directories.`
    );
    console.log(
      `You can configure search directories in ${CONFIG_FILE_NAME} in your home directory`
    );
    process.exit(1);
  }

  // Check out the PR
  const checkoutSuccess = checkoutPR(repoPath, prNumber);
  if (!checkoutSuccess) {
    process.exit(1);
  }

  // Handle editor options
  let openEditor = true;
  let newWindow = false;

  if (options.noEditor) {
    openEditor = false;
  } else if (options.newEditor) {
    openEditor = true;
    newWindow = true;
  } else if (options.reuseEditor) {
    openEditor = true;
    newWindow = false;
  } else {
    // Prompt user to open editor if no editor option is specified
    const answer = await promptOpenEditor();

    if (answer === "n" || answer === "no") {
      openEditor = false;
    } else if (answer === "w" || answer === "window") {
      openEditor = true;
      newWindow = true;
    } else {
      // Default to yes
      openEditor = true;
      newWindow = false;
    }
  }

  if (openEditor) {
    openInVSCode(repoPath, newWindow);
  } else {
    console.log("PR checked out successfully. Repository path:", repoPath);
  }

  // Start session timer if not disabled
  if (!options.noSession) {
    // Use specified duration or default from config
    const sessionDuration = options.duration || config.defaultSessionDuration;
    startSessionTimer(prUrl, sessionDuration);
  }
}

// Configure commander
program
  .name("pr-review")
  .description("Tool to check out GitHub PRs and open them in your editor")
  .version(VERSION, "-v, --version")
  .argument("<pr-url>", "GitHub PR URL")
  .option("--no-editor", "Do not open the editor")
  .option("--new-editor", "Open in a new editor window")
  .option("--reuse-editor", "Reuse existing editor window")
  .option(
    "-d, --duration <minutes>",
    "Specify session duration in minutes",
    parseInt
  )
  .option("--no-session", "Do not start a session timer")
  .option("-V, --verbose", "Enable verbose output")
  .action(main);

// Add which-config subcommand
program
  .command("which-config")
  .description("Show the location of the config file")
  .action(() => {
    const configPath = path.join(os.homedir(), CONFIG_FILE_NAME);
    console.log(configPath);
  });

// Add init subcommand
program
  .command("init")
  .description("Generate an initial configuration file")
  .option("-d, --default", "Use default values without prompting")
  .action(async (options) => {
    const configPath = path.join(os.homedir(), CONFIG_FILE_NAME);

    // Check if config already exists
    if (fs.existsSync(configPath)) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await rl.question(
        "Configuration file already exists. Overwrite? [y/N]: "
      );
      rl.close();

      if (answer !== "y" && answer !== "yes") {
        console.log("Operation cancelled.");
        process.exit(0);
      }
    }

    const defaultConfig: Config = {
      searchDirs: [process.cwd()],
      defaultSessionDuration: 25,
    };

    let config: Config = defaultConfig;

    if (!options.default) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      // Prompt for search directories
      const dirsAnswer = await rl.question(
        `Enter search directories (comma-separated, default: ${process.cwd()}): `
      );

      if (dirsAnswer) {
        config.searchDirs = dirsAnswer.split(",").map((dir) => dir.trim());
      }

      // Prompt for session duration
      const durationAnswer = await rl.question(
        `Enter default session duration in minutes (default: 25): `
      );
      rl.close();

      if (durationAnswer) {
        const duration = parseInt(durationAnswer);
        if (!isNaN(duration) && duration > 0) {
          config.defaultSessionDuration = duration;
        }
      }
    }

    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Configuration file created at: ${configPath}`);
    } catch (error) {
      console.error("Failed to create configuration file:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
