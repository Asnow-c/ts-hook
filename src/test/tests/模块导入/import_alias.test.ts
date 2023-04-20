import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);

describe.concurrent("使用别名导入", function () {
    const dir = meta.dir + "/import_alias/self/src";
    it("cts导入", async function () {
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
