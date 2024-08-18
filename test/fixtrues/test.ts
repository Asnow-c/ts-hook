import { expect } from "vitest";
import { fileURLToPath, pathToFileURL } from "url";
import path from "node:path";
import { spawnSync } from "child_process";

expect.extend({
  processExist(received: Process, exacted: number = 0) {
    const { isNot } = this;
    const code = received.exit?.code;
    return {
      pass: code === exacted,
      message: () => `Process exit ${isNot ? "not" : ""} with ${code}`,
    };
  },
});

const file = __filename; // fileURLToPath(import.meta.url);
const dirname = path.resolve(file, "..");
const dir = path.resolve(dirname, "../__env");

interface CustomMatchers<R = unknown> {
  processExist: (code?: number) => R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export const testVersions = [18, 20, 22].map((version) => path.resolve(dir, "node" + version + ".exe"));

export function resolveJsPath(meta: ImportMeta) {
  let file = fileURLToPath(meta.url);
  let dir = path.resolve(file, "..");
  return { file, dir };
}

const cwd = process.cwd();
const loaderPath = pathToFileURL(cwd + "/hook.mjs").toString();

export class TestSpawn {
  constructor(private node: string = testVersions[0]) {}
  spawnSync(absPath: string, env?: Record<string, any>) {
    const res = spawnSync(this.node, ["--loader", loaderPath, absPath], {
      env: { ...env, COMPILER: "tsc" },
    });

    return {
      code: res.status,
      signal: res.signal,
      stdout: res.stdout.toString(),
      stderr: res.stderr.toString(),
    };
  }
}
