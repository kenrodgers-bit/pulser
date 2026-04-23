const fs = require("node:fs");
const path = require("node:path");

const publicDir = path.resolve(__dirname, "..", "public");

if (!fs.existsSync(publicDir)) {
  process.exit(0);
}

for (const entry of fs.readdirSync(publicDir)) {
  fs.rmSync(path.join(publicDir, entry), {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  });
}
