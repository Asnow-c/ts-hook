import { expect, it, describe } from "vitest";
import { resolveJsPath, TestSpawn } from "../../fixtrues/test";

const command = new TestSpawn();
let meta = resolveJsPath(import.meta);

describe.concurrent("导入自身包", function () {
  const dir = meta.dir + "/import_self/src";
  it("cts导入", async function () {
    let process = command.spawnSync(dir + "/import_self.cts");
    expect(process.code).toBe(0);
  });
  it("mts", async function () {
    let process = command.spawnSync(dir + "/import_self.mts");
    expect(process.code).toBe(0);
  });
});
