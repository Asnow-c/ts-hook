import { expect, it, describe } from "vitest";
import { Process, expectPs, resolveJsPath } from "../../util";

let meta = resolveJsPath(import.meta);
describe.concurrent("cts", function () {
    it("完整扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./完整扩展名导入.cts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts", "imported cts", "entry"]);
    });
    it("省略扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./省略扩展名导入.cts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts", "entry"]);
    });
    it("ts扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./导入ts扩展名.cts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts"]);
    });
    it("导入目录", async function () {
        const ps = await Process.run(meta.dir, "./导入目录.cts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported dir", "entry"]);
    });
    it("动态导入mts", async function () {
        const ps = await Process.run(meta.dir, "./cjs/a.cts");
        expectPs(ps).isSafeExit();
    });
});
describe.concurrent("mts", function () {
    it("完整扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./完整扩展名导入.mts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts", "imported cts", "imported mts", "entry"]);
    });
    it("省略扩展名导入-开启与commonjs相同解析策略", async function () {
        const ps = await Process.run(meta.dir, "./省略扩展名导入.mts", { sameParsing: true });
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts", "entry"]);
    });

    it("ts扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./导入ts扩展名.mts");
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported ts"]);
    });
    it("导入目录-开启与commonjs相同解析策略", async function () {
        const ps = await Process.run(meta.dir, "./导入目录.mts", { sameParsing: true });
        expectPs(ps).isSafeExit();
        expectPs(ps).messageToEqual(["imported dir", "entry"]);
    });
    it("省略扩展名导入", async function () {
        const ps = await Process.run(meta.dir, "./省略扩展名导入.mts");
        expect(ps.exit?.code).toBe(1);
    });
    it("导入目录", async function () {
        const ps = await Process.run(meta.dir, "./导入目录.mts");
        expect(ps.exit?.code).toBe(1);
    });
});
