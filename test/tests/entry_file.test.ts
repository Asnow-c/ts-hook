import { expect, it, describe } from "vitest";
import { resolveJsPath, TestSpawn } from "../fixtrues/test";
import path from "node:path";
const command = new TestSpawn();
let meta = resolveJsPath(import.meta);

const dir = path.resolve(meta.dir, "入口文件");

describe("测试入口文件", function () {
  it("运行ts文件", async function () {
    let res = command.spawnSync(dir + "/entry.ts");
    expect(res.code).toBe(0);
  });
  it("运行ts文件-自动识别es", async function () {
    let res = command.spawnSync(dir + "/pkg_mjs/deep/file.ts");
    expect(res.code).toBe(0);
  });
  it("运行ts文件-自动识别为commonjs", async function () {
    let res = command.spawnSync(dir + "/pkg_cjs/deep/file.ts");
    expect(res.code).toBe(0);
  });
  it("运行cts文件", async function () {
    let res = command.spawnSync(dir + "/entry_cts.cts");
    expect(res.code).toBe(0);
  });
  it("运行mts文件", async function () {
    let res = command.spawnSync(dir + "/entry_mts.mts");
    expect(res.code).toBe(0);
  });
  it("运行type:module的包", async function () {
    let res = command.spawnSync(dir + "/pkg_mjs/deep/file.ts");
    expect(res.code).toBe(0);
  });
  it("运行type:commonjs的包", async function () {
    let res = command.spawnSync(dir + "/pkg_cjs/main.ts");
    expect(res.code).toBe(0);
  });
});
