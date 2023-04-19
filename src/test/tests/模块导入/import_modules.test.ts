import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);

describe.concurrent("导入package.json指定的main", function () {
    describe.concurrent("导入没有exports但有main字段的包", function () {
        const dir = meta.dir + "/import_modules/has_main";
        it("cts导入", async function () {
            let process = await Process.run(dir, "import_main.cts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["main.ts", "entry"]);
        });
        it("mts", async function () {
            let process = await Process.run(dir, "import_main.mts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["main.ts", "entry"]);
        });
    });
    describe.concurrent("导入没有main且没有exports字段的包", function () {
        const dir = meta.dir + "/import_modules/no_main_no_exports";
        it("cts导入", async function () {
            let process = await Process.run(dir, "import_main.cts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["index.ts", "entry"]);
        });
        it("mts", async function () {
            let process = await Process.run(dir, "import_main.mts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["index.ts", "entry"]);
        });
    });
    describe.concurrent("导入有exports字段的包", function () {
        const dir = meta.dir + "/import_modules/has_exports";
        it("cts导入包", async function () {
            let process = await Process.run(dir, "import_main.cts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["main.ts"]);
        });
        it("mts导入包", async function () {
            let process = await Process.run(dir, "import_main.mts");
            expectPs(process).isSafeExit();
            expectPs(process).messageToEqual(["main.ts"]);
        });
    });
});
