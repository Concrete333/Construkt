import { spawnSync } from "node:child_process";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const run = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): void => {
  const result = spawnSync(command, args, {
    cwd: options?.cwd ?? repoRoot,
    env: options?.env ?? process.env,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runInWsl = (): void => {
  const distroCheck = spawnSync("wsl", ["-l", "-q"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (distroCheck.error) {
    throw distroCheck.error;
  }
  const distroList = (distroCheck.stdout ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\0/g, "")
    .trim();
  if (distroCheck.status !== 0 || !distroList) {
    fail(
      "WSL is required for localnet reset, but no Linux distribution is installed. Install Ubuntu or another WSL distro with Solana CLI and Anchor."
    );
  }

  const repoRootForWsl = repoRoot.replace(/\\/g, "/");
  const pathCheck = spawnSync("wsl", ["wslpath", "-a", "-u", repoRootForWsl], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (pathCheck.error) {
    throw pathCheck.error;
  }
  const wslRepoRoot = (pathCheck.stdout ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\0/g, "")
    .trim();
  if (pathCheck.status !== 0 || !wslRepoRoot) {
    fail(`Could not convert repo path for WSL: ${repoRoot}`);
  }

  run("wsl", [
    "--exec",
    "env",
    `REPO=${wslRepoRoot}`,
    "bash",
    "-lc",
    'cd "$REPO" && bash scripts/reset-localnet.sh',
  ]);
};

if (process.platform === "win32") {
  runInWsl();
} else {
  run("bash", ["scripts/reset-localnet.sh"]);
}
