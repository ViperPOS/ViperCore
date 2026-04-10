const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

let hasErrors = false;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  hasErrors = true;
}

function verifyRootShims() {
  const rootJsFiles = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => entry.name);

  const expectedShims = {
    "main.js": "src/main/main.js",
    "backup.js": "src/main/backup.js",
    "restore.js": "src/main/restore.js",
  };

  for (const [shimName, target] of Object.entries(expectedShims)) {
    const shimPath = path.join(projectRoot, shimName);
    if (!fs.existsSync(shimPath)) {
      fail(`Missing root shim: ${shimName} -> ${target}`);
      continue;
    }
    const content = fs.readFileSync(shimPath, "utf8").trim();
    const expectedContent = target === "src/main/main.js"
      ? `require("./${target}");`
      : `module.exports = require("./${target}");`;
    if (content !== expectedContent) {
      fail(`Root shim ${shimName} has unexpected content. Expected: ${expectedContent}`);
    }

    const targetPath = path.join(projectRoot, target);
    if (!fs.existsSync(targetPath)) {
      fail(`Root shim ${shimName} points to missing target: ${target}`);
    }
  }
}

function verifyNoLegacyShims() {
  const rootFiles = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

  const rendererShims = rootFiles.filter((name) => {
    if (!name.endsWith(".js") && !name.endsWith(".css")) return false;
    const content = fs.readFileSync(path.join(projectRoot, name), "utf8").trim();
    return (
      content.includes("src/renderer/modules/") ||
      content.includes("src/renderer/styles/")
    );
  });

  if (rendererShims.length > 0) {
    fail(`Legacy renderer shims found at root (should be removed): ${rendererShims.join(", ")}`);
  }
}

function verifyReactEntryPoints() {
  const requiredReactFiles = [
    "src/renderer/index.html",
    "src/renderer/main.jsx",
    "src/renderer/App.jsx",
    "src/renderer/services/ipcService.js",
  ];

  for (const filePath of requiredReactFiles) {
    const fullPath = path.join(projectRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      fail(`Missing React entry point: ${filePath}`);
    }
  }

  const indexHtml = path.join(projectRoot, "src/renderer/index.html");
  if (fs.existsSync(indexHtml)) {
    const content = fs.readFileSync(indexHtml, "utf8");
    if (!content.includes('id="root"')) {
      fail('src/renderer/index.html is missing the React mount node (<div id="root">)');
    }
  }
}

function verifyViteConfig() {
  const viteConfigPath = path.join(projectRoot, "vite.config.js");
  if (!fs.existsSync(viteConfigPath)) {
    fail("Missing vite.config.js");
    return;
  }

  const content = fs.readFileSync(viteConfigPath, "utf8");
  if (!content.includes("src/renderer")) {
    fail("vite.config.js does not reference src/renderer as root or entry");
  }
}

function main() {
  verifyRootShims();
  verifyNoLegacyShims();
  verifyReactEntryPoints();
  verifyViteConfig();

  if (hasErrors) {
    console.error("\nArchitecture verification failed.");
    process.exit(1);
  }

  console.log("Architecture verification passed.");
}

main();