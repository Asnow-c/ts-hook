import { expect, it, describe } from "vitest";
import { Process, resolveJsPath, expectPs } from "../../util";

let meta = resolveJsPath(import.meta);
describe.concurrent("测试入口文件", function () {
    it("运行ts文件", async function () {
        let process = await Process.run(meta.dir, "entry.ts");
        expectPs(process).isSafeExit();
    });
    it("运行ts文件-自动识别es", async function () {
        let process = await Process.run(meta.dir, "pkg_mjs/deep/file.ts");
        expectPs(process).isSafeExit();
    });
    it("运行ts文件-自动识别为commonjs", async function () {
        let process = await Process.run(meta.dir, "pkg_cjs/deep/file.ts");
        expectPs(process).isSafeExit();
    });
    it("运行cts文件", async function () {
        let process = await Process.run(meta.dir, "entry_cts.cts");
        expectPs(process).isSafeExit();
    });
    it("运行mts文件", async function () {
        let process = await Process.run(meta.dir, "entry_mts.mts");
        expectPs(process).isSafeExit();
    });
    it("运行type:module的包", async function () {
        let process = await Process.run(meta.dir, "pkg_mjs/main.ts");
        expectPs(process).isSafeExit();
    });
    it("运行type:commonjs的包", async function () {
        let process = await Process.run(meta.dir, "pkg_cjs/main.ts");
        expectPs(process).isSafeExit();
    });
});
