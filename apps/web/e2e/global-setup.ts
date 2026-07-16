import { execSync } from "node:child_process";
import path from "node:path";

export default function globalSetup() {
  const root = path.resolve(__dirname, "../../..");
  execSync("pnpm db:bootstrap:auth", {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}
