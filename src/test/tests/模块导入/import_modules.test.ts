import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);
describe.concurrent("导入包的子模块", function () {
    describe.concurrent("导入没有exports字段的包", function () {
        const dir = meta.dir + "/import_sub/no_exports";
        describe.concurrent("cts", function () {
            const ext = ".cts";
            it("导入目录", async function () {
                let process = await Process.run(dir, "import_dir" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["index.ts", "entry"]);
            });
            it("导入文件", async function () {
                let process = await Process.run(dir, "import_file" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["index.ts", "entry"]);
            });
        });
        describe.concurrent("mts", function () {
            const ext = ".mts";
            it("导入目录", async function () {
                let process = await Process.run(dir, "import_dir" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["index.ts", "entry"]);
            });
            it("导入文件", async function () {
                let process = await Process.run(dir, "import_file" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["index.ts", "entry"]);
            });
        });
    });
    describe.concurrent("导入有exports字段的包", function () {
        const dir = meta.dir + "/import_sub/has_exports";
        describe.concurrent("cts", function () {
            const ext = ".cts";
            it("导入目录", async function () {
                let process = await Process.run(dir, "import_dir" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
            });

            it("导入文件", async function () {
                let process = await Process.run(dir, "import_file" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
            });
        });
        describe.concurrent("mts", function () {
            const ext = ".mts";
            it("导入目录", async function () {
                let process = await Process.run(dir, "import_dir" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
            });
            it("导入文件", async function () {
                let process = await Process.run(dir, "import_file" + ext);
                expectPs(process).isSafeExit();
                expectPs(process).messageToEqual(["ERR_PACKAGE_PATH_NOT_EXPORTED"]);
            });
        });
    });
});

describe.concurrent("导入package.json指定的main", function () {
    describe.concurrent("导入没有exports字段的包", function () {
        const dir = meta.dir + "/import_modules/no_exports";
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
