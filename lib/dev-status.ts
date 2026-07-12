import "server-only";
import { execFileSync } from "node:child_process";

export type CommitInfo = {
  hash: string;
  message: string;
  author: string;
  date: string;
};

const SEPARADOR = "\x1f";

export function obterUltimosCommits(limit = 10): CommitInfo[] {
  try {
    const output = execFileSync(
      "git",
      [
        "log",
        `-${limit}`,
        `--pretty=format:%h${SEPARADOR}%s${SEPARADOR}%an${SEPARADOR}%ad`,
        "--date=format:%Y-%m-%d %H:%M",
      ],
      { cwd: process.cwd(), encoding: "utf-8" }
    );

    return output
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, date] = line.split(SEPARADOR);
        return { hash, message, author, date };
      });
  } catch {
    return [];
  }
}
