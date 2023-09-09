import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);

describe.concurrent("使用imports别名导入", function () {
    const dir = meta.dir + "/import_alias/self/src";
    it("cts", async function () {
        let process = await Process.run(dir, "entry.cts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
    it("mts", async function () {
        let process = await Process.run(dir, "entry.mts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
});

describe.concurrent("使用tsconfig的paths别名导入", function () {
    const dir = meta.dir + "/import_alias/ts_paths_alias";

    it("cts-全路径别名", async function () {
        let process = await Process.run(dir, "entry_full_ext.cts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
    it("mts-全路径别名", async function () {
        let process = await Process.run(dir, "entry_full_ext.mts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
    it("cts-无扩展名别名", async function () {
        let process = await Process.run(dir, "entry_no_ext.cts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
    it("mts-无扩展名别名", async function () {
        let process = await Process.run(dir, "entry_no_ext.mts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["alias"]);
    });
});
