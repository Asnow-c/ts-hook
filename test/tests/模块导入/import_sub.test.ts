import { expect, it, describe } from "vitest";
import { resolveJsPath, TestSpawn } from "../../fixtrues/test";

const command = new TestSpawn();
let meta = resolveJsPath(import.meta);
describe("导入没有exports字段的包", function () {
  const dir = meta.dir + "/import_sub/no_exports";
  describe("cts", function () {
    const ext = ".cts";
    it("导入目录", async function () {
      let process = command.spawnSync(dir + "/import_dir" + ext);
      expect(process.code).toBe(0);
    });
    it("导入文件", async function () {
      let process = command.spawnSync(dir + "/import_file" + ext);
      expect(process.code).toBe(0);
    });
  });
  describe("mts", function () {
    const ext = ".mts";
    it("导入目录", async function () {
      let process = command.spawnSync(dir + "/import_dir" + ext);
      expect(process.code).toBe(1);
    });
    it("导入文件", async function () {
      let process = command.spawnSync(dir + "/import_file" + ext);
      expect(process.code).toBe(1);
    });
    it("导入目录-开启commonjs相同解析策略", async function () {
      let process = command.spawnSync(dir + "/import_dir" + ext, { SAME_PARSER: "true" });
      expect(process.code).toBe(0);
    });
    it("导入文件-开启commonjs相同解析策略", async function () {
      let process = command.spawnSync(dir + "/import_file" + ext, { SAME_PARSER: "true" });
      expect(process.code).toBe(0);
    });
  });
});
describe("导入有exports字段的包, 自动尝试转换.js", function () {
  const dir = meta.dir + "/import_sub/has_exports";
  describe("cts", function () {
    const ext = ".cts";
    it("导入目录", async function () {
      let process = command.spawnSync(dir + "/import_dir" + ext);
      expect(process.code).toBe(0);
      //   expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
    });

    it("导入文件", async function () {
      let process = command.spawnSync(dir + "/import_file" + ext);
      expect(process.code).toBe(0);
      //   expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
    });
  });
  describe("mts", function () {
    const ext = ".mts";
    it("导入目录", async function () {
      let process = command.spawnSync(dir + "/import_dir" + ext);
      expect(process.code).toBe(0);
      //   expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
    });
    it("导入文件", async function () {
      let process = command.spawnSync(dir + "/import_file" + ext);
      expect(process.code).toBe(0);
      //   expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
    });
  });
});
