import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);

describe.concurrent("导入自身包", function () {
    const dir = meta.dir + "/import_self/src";
    it("cts导入", async function () {
        let process = await Process.run(dir, "import_self.cts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["mod"]);
    });
    it("mts", async function () {
        let process = await Process.run(dir, "import_self.mts");
        expectPs(process).isSafeExit();
        expectPs(process).messageToEqual(["mod"]);
    });
});
