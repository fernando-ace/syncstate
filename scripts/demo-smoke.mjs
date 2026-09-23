import { spawn } from "node:child_process";
import { join } from "node:path";

const electron = join(
  process.cwd(),
  "node_modules",
  "electron",
  "dist",
  process.platform === "win32" ? "electron.exe" : "electron"
);

const child = spawn(electron, [".", "--smoke-test"], {
  cwd: process.cwd(),
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
const capture = (chunk) => {
  const text = chunk.toString();
  output += text;
  process.stdout.write(text);
};
child.stdout.on("data", capture);
child.stderr.on("data", capture);
child.on("error", (error) => {
  clearTimeout(timeout);
  console.error(`Unable to start Electron: ${error.message}`);
  process.exitCode = 1;
});

const timeout = setTimeout(() => {
  child.kill();
  console.error("Demo smoke test timed out.");
  process.exitCode = 1;
}, 20_000);

child.on("exit", (code) => {
  clearTimeout(timeout);
  if (code !== 0 || !output.includes("DEMO_SMOKE_OK")) {
    console.error(`Demo smoke test failed with exit code ${code}.`);
    process.exitCode = 1;
  }
});
