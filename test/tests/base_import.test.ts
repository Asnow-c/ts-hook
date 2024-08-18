import { expect, it, describe } from "vitest";
import { TestSpawn, resolveJsPath } from "../fixtrues/test";
import path from "node:path";
const command = new TestSpawn();
let meta = resolveJsPath(import.meta);

const dir = path.resolve(meta.dir, "基础导入");

describe("cts", function () {
  it("完整扩展名导入", async function () {
    const res = command.spawnSync(dir + "/完整扩展名导入.cts");
    expect(res.code).toBe(8);
  });
  it("省略扩展名导入", async function () {
    const res = command.spawnSync(dir + "/省略扩展名导入.cts");
    expect(res.code).toBe(8);
  });
  it("ts扩展名导入", async function () {
    const res = command.spawnSync(dir + "/导入ts扩展名.cts");
    expect(res.code).toBe(8);
  });
  it("导入目录", async function () {
    const res = command.spawnSync(dir + "/导入目录.cts");
    expect(res.code).toBe(8);
  });
  it("动态导入mts", async function () {
    const res = command.spawnSync(dir + "/动态导入mts.cts");
    expect(res.code).toBe(8);
  });
});
describe("mts", function () {
  it("完整扩展名导入", async function () {
    const res = command.spawnSync(dir + "/完整扩展名导入.mts");
    expect(res.code).toBe(8);
  });
  it("省略扩展名导入-开启与commonjs相同解析策略", async function () {
    const res = command.spawnSync(dir + "/省略扩展名导入.mts", { SAME_PARSER: "true" });
    expect(res.code).toBe(8);
  });

  it("ts扩展名导入", async function () {
    const res = command.spawnSync(dir + "/导入ts扩展名.mts");
    expect(res.code).toBe(8);
  });
  it("导入目录-开启与commonjs相同解析策略", async function () {
    const res = command.spawnSync(dir + "/导入目录.mts", { SAME_PARSER: "true" });
    expect(res.code).toBe(8);
  });
  it("省略扩展名导入", async function () {
    const res = command.spawnSync(dir + "/省略扩展名导入.mts");
    expect(res.code).toBe(1);
  });
  it("导入目录", async function () {
    const res = command.spawnSync(dir + "/导入目录.mts");
    expect(res.code).toBe(1);
  });
});
