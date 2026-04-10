const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const requiredPaths = [
  "src/main/main.js",
  "src/main/backup.js",
  "src/main/restore.js",
  "src/renderer/index.html",
  "src/renderer/main.jsx",
  "src/renderer/App.jsx",
  "src/renderer/pages/DashboardPage.jsx",
  "src/renderer/services/ipcService.js",
  "vite.config.js",
  "main.js",
  "backup.js",
  "restore.js",
  "package.json",
];

const forbiddenRootFiles = [
  "getOnline.js",
  "startMongoExpress.js",
  "startMongoExpress.exe",
];

const forbiddenOnlineDeps = [
  "axios",
  "dotenv",
  "electron-log",
  "electron-updater",
  "express",
  "googleapis",
  "mongodb",
  "mongodb-memory-server",
  "mongoose",
  "ws",
];

const forbiddenOnlineResources = [
  ".env",
  "getOnline.js",
  "startMongoExpress.js",
  "startMongoExpress.exe",
];

function fail(message) {
  console.error(`Project structure verification failed: ${message}`);
  process.exit(1);
}

function ensureRequiredPathsExist() {
  const missing = requiredPaths.filter((relativePath) => {
    return !fs.existsSync(path.join(projectRoot, relativePath));
  });

  if (missing.length > 0) {
    fail(`Missing required files:\n- ${missing.join("\n- ")}`);
  }

  // Ensure legacy modules directory was properly removed
  const legacyModules = path.join(projectRoot, "src", "renderer", "modules");
  if (fs.existsSync(legacyModules)) {
    fail("Legacy src/renderer/modules/ directory should have been removed.");
  }
}

function ensureRootIsClean() {
  const rootEntries = fs.readdirSync(projectRoot, { withFileTypes: true });
  const rootFiles = new Set(
    rootEntries.filter((entry) => entry.isFile()).map((entry) => entry.name)
  );

  const forbiddenPresent = forbiddenRootFiles.filter((name) => rootFiles.has(name));
  if (forbiddenPresent.length > 0) {
    fail(`Forbidden online-only files found in root:\n- ${forbiddenPresent.join("\n- ")}`);
  }
}

function ensureRendererIndexUsesViteEntry() {
  const rendererIndexPath = path.join(projectRoot, "src/renderer/index.html");
  const rendererIndex = fs.readFileSync(rendererIndexPath, "utf8");

  if (!rendererIndex.includes('<div id="root"></div>')) {
    fail("src/renderer/index.html is missing the #root mount node");
  }

  if (!rendererIndex.includes('src="/main.jsx"')) {
    fail("src/renderer/index.html must include Vite entry script /main.jsx");
  }
}

function ensureOfflineDependencyPolicy() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")
  );

  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const forbiddenDepsFound = forbiddenOnlineDeps.filter((name) => deps[name]);
  if (forbiddenDepsFound.length > 0) {
    fail(`Forbidden online dependencies found:\n- ${forbiddenDepsFound.join("\n- ")}`);
  }

  const extraResources = Array.isArray(packageJson.build?.extraResources)
    ? packageJson.build.extraResources
    : [];

  const forbiddenResourcesFound = extraResources
    .map((item) => item?.from)
    .filter((value) => typeof value === "string")
    .filter((fromPath) =>
      forbiddenOnlineResources.some((name) =>
        fromPath.toLowerCase().includes(name.toLowerCase())
      )
    );

  if (forbiddenResourcesFound.length > 0) {
    fail(`Forbidden online build resources found:\n- ${forbiddenResourcesFound.join("\n- ")}`);
  }
}

function main() {
  ensureRequiredPathsExist();
  ensureRootIsClean();
  ensureRendererIndexUsesViteEntry();
  ensureOfflineDependencyPolicy();
  console.log("Project structure verification passed.");
}

main();
