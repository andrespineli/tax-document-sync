import { readFileSync } from "node:fs";

const allowedLicenses = [
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "CC-BY-4.0",
  "BlueOak-1.0.0",
  "Python-2.0",
  "WTFPL",
];

const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const licenseCounts = new Map();
const blocked = [];
const missing = [];

for (const [path, metadata] of Object.entries(packageLock.packages)) {
  if (!path || !path.startsWith("node_modules/")) {
    continue;
  }

  const packageMetadata = metadata;
  const packageJson = readPackageJson(path);
  const name = packageJson.name ?? packageMetadata.name ?? path.replace("node_modules/", "");
  const version = packageJson.version ?? packageMetadata.version ?? "unknown";
  const license = String(packageMetadata.license ?? packageJson.license ?? "");

  if (!license) {
    missing.push(`${name}@${version}`);
    continue;
  }

  licenseCounts.set(license, (licenseCounts.get(license) ?? 0) + 1);

  if (!isAllowed(license)) {
    blocked.push(`${name}@${version}: ${license}`);
  }
}

if (missing.length > 0 || blocked.length > 0) {
  if (missing.length > 0) {
    console.error("Packages without license metadata:");
    for (const item of missing) {
      console.error(`- ${item}`);
    }
  }

  if (blocked.length > 0) {
    console.error("Packages with licenses outside the approved permissive set:");
    for (const item of blocked) {
      console.error(`- ${item}`);
    }
  }

  process.exit(1);
}

console.log("License check passed. License summary:");
for (const [license, count] of [...licenseCounts.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`${license}: ${count}`);
}

function readPackageJson(path) {
  try {
    return JSON.parse(readFileSync(`${path}/package.json`, "utf8"));
  } catch {
    return {};
  }
}

function isAllowed(license) {
  const normalized = license.replace(/[()]/g, " ");
  return allowedLicenses.some((allowed) => normalized.split(/\s+OR\s+|\s+/).includes(allowed));
}
