#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const [, , packageName, binName, ...args] = process.argv;

if (!packageName || !binName) {
  console.error("Usage: node scripts/run-node-bin.cjs <package-name> <bin-name> [...args]");
  process.exit(1);
}

function findPackageRoot(targetPackage) {
  const resolvedEntry = require.resolve(targetPackage, {
    paths: [process.cwd(), __dirname],
  });

  let currentDir = path.dirname(resolvedEntry);

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

      if (packageJson.name === targetPackage) {
        return {
          packageDir: currentDir,
          packageJson,
        };
      }
    }

    currentDir = path.dirname(currentDir);
  }

  throw new Error(`Unable to locate package root for ${targetPackage}`);
}

let resolvedModule;

try {
  const { packageDir, packageJson } = findPackageRoot(packageName);
  const binField = packageJson.bin;

  if (typeof binField === "string") {
    resolvedModule = path.resolve(packageDir, binField);
  } else if (binField && typeof binField === "object" && typeof binField[binName] === "string") {
    resolvedModule = path.resolve(packageDir, binField[binName]);
  } else {
    throw new Error(`Package ${packageName} does not expose a bin named ${binName}`);
  }
} catch (error) {
  console.error(`Unable to resolve binary entrypoint: ${packageName} ${binName}`);
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

const result = spawnSync(process.execPath, [resolvedModule, ...args], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
