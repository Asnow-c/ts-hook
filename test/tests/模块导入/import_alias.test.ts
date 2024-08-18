import { expect, it, describe } from "vitest";
import { resolveJsPath, TestSpawn } from "../../fixtrues/test";

const command = new TestSpawn();
let meta = resolveJsPath(import.meta);

describe("使用imports别名导入", function () {
  const dir = meta.dir + "/import_alias/self/src";
  it("cts", async function () {
    let process = command.spawnSync(dir + "/entry.cts");
    expect(process.code).toBe(0);
  });
  it("mts", async function () {
    let process = command.spawnSync(dir + "/entry.mts");
    expect(process.code).toBe(0);
  });
});

describe("使用tsconfig的paths别名导入", function () {
  const dir = meta.dir + "/import_alias/ts_paths_alias";

  it("cts-全路径别名", async function () {
    let process = command.spawnSync(dir + "/entry_full_ext.cts");
    expect(process.code).toBe(0);
  });
  it("mts-全路径别名", async function () {
    let process = command.spawnSync(dir + "/entry_full_ext.mts");
    expect(process.code).toBe(0);
  });
  it("cts-无扩展名别名", async function () {
    let process = command.spawnSync(dir + "/entry_no_ext.cts");
    expect(process.code).toBe(0);
  });
  it("mts-无扩展名别名", async function () {
    let process = command.spawnSync(dir + "/entry_no_ext.mts");
    expect(process.code).toBe(1);
  });
  it("mts-无扩展名别名-开启commonjs解析", async function () {
    let process = command.spawnSync(dir + "/entry_no_ext.mts", { SAME_PARSER: "true" });
    expect(process.code).toBe(0);
  });
});
