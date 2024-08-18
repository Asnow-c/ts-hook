import { expect, it, describe } from "vitest";
import { resolveJsPath, TestSpawn } from "../../fixtrues/test";

const command = new TestSpawn();
let meta = resolveJsPath(import.meta);

describe("导入package.json指定的main", function () {
  describe("导入没有exports但有main字段的包", function () {
    const dir = meta.dir + "/import_modules/has_main";
    it("cts导入", async function () {
      let process = command.spawnSync(dir + "/import_main.cts");
      expect(process.code).toBe(0);
    });
    it("mts", async function () {
      let process = command.spawnSync(dir + "/import_main.mts");
      expect(process.code).toBe(0);
    });
  });
  describe("导入没有main且没有exports字段的包", function () {
    const dir = meta.dir + "/import_modules/no_main_no_exports";
    it("cts导入", async function () {
      let process = command.spawnSync(dir + "/import_main.cts");
      expect(process.code).toBe(0);
    });
    it("mts-开启相同commonjs解析策略", async function () {
      let process = command.spawnSync(dir + "/import_main.mts", { SAME_PARSER: "true" });
      expect(process.code).toBe(0);
    });
    it("mts", async function () {
      let process = command.spawnSync(dir + "/import_main.mts");
      expect(process.code).toBe(1);
    });
  });
  describe("导入有exports字段的包", function () {
    const dir = meta.dir + "/import_modules/has_exports";
    it("cts导入包", async function () {
      let process = command.spawnSync(dir + "/import_main.cts");
      expect(process.code).toBe(0);
    });
    it("mts导入包", async function () {
      let process = command.spawnSync(dir + "/import_main.mts");
      expect(process.code).toBe(0);
    });
  });
});
