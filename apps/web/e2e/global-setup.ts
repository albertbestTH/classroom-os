import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const root = path.resolve(__dirname, "../../..");
  execSync("pnpm db:e2e:cleanup", {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  execSync("pnpm db:bootstrap:auth", {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
  execSync("pnpm db:e2e:prepare", {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}
