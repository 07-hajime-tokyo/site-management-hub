import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_PROJECT_ID = "prj_Derah8fqdDbu5kOH6tZvA0TOSjuy";
const EXPECTED_ORG_ID = "team_6dUXI0G0s5EUoy9iHG8519vn";
const EXPECTED_PROJECT_NAME = "site-management-hub";

const projectPath = resolve(".vercel", "project.json");

let project;
try {
  project = JSON.parse(readFileSync(projectPath, "utf8"));
} catch (error) {
  console.error(`Vercel project link is missing or unreadable: ${projectPath}`);
  console.error("Run: vercel link --yes --project site-management-hub --scope hajime-s-projects-9906072f");
  process.exit(1);
}

const mismatches = [
  ["projectId", EXPECTED_PROJECT_ID],
  ["orgId", EXPECTED_ORG_ID],
  ["projectName", EXPECTED_PROJECT_NAME],
].filter(([key, expected]) => project[key] !== expected);

if (mismatches.length) {
  console.error("Vercel project link points to the wrong project.");
  for (const [key, expected] of mismatches) {
    console.error(`- ${key}: expected ${expected}, got ${project[key] || "(empty)"}`);
  }
  console.error("Run: vercel link --yes --project site-management-hub --scope hajime-s-projects-9906072f");
  process.exit(1);
}

console.log("Vercel project link verified: hajime-s-projects-9906072f/site-management-hub");
