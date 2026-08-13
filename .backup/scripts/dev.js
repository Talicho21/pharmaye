const { spawn } = require("child_process");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "..");

function isEnabled(envValue) {
  if (envValue === undefined) {
    return true;
  }

  return !["0", "false", "off"].includes(String(envValue).toLowerCase());
}

function startService(name, workingDirectory) {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", "npm run dev"], {
          cwd: workingDirectory,
          stdio: "inherit",
        })
      : spawn("npm", ["run", "dev"], {
          cwd: workingDirectory,
          stdio: "inherit",
        });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    if (code && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exitCode = code;
      process.kill(process.pid);
    }
  });

  return child;
}

const backend = isEnabled(process.env.START_BACKEND)
  ? startService("backend", path.join(workspaceRoot, "pharmacy-backend"))
  : null;
const frontend = isEnabled(process.env.START_FRONTEND)
  ? startService("frontend", path.join(workspaceRoot, "pharmacy-frontend"))
  : null;

if (!backend && !frontend) {
  console.error("No services enabled. Set START_BACKEND and/or START_FRONTEND to true.");
  process.exit(1);
}

function shutdown(signal) {
  if (backend) {
    backend.kill(signal);
  }

  if (frontend) {
    frontend.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));