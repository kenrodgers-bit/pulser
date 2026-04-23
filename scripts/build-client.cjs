const { spawnSync } = require("node:child_process");
const path = require("node:path");

const LOCAL_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;
const envNames = ["VITE_API_URL", "VITE_SERVER_URL"];

for (const envName of envNames) {
  const value = process.env[envName]?.trim() ?? "";

  // Local .env files are useful for dev, but must never leak into production bundles.
  process.env[envName] = !value || LOCAL_URL_PATTERN.test(value) ? "" : value;
}

const rootDir = path.resolve(__dirname, "..");

const runNodeBin = (packageName, binName, args = []) => {
  const result = spawnSync(
    process.execPath,
    [path.join(rootDir, "scripts", "run-node-bin.cjs"), packageName, binName, ...args],
    {
      cwd: path.join(rootDir, "client"),
      env: process.env,
      stdio: "inherit",
    },
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

runNodeBin("typescript", "tsc", ["-b"]);
runNodeBin("vite", "vite", ["build"]);
