import { TsCompilerConfig } from "./common_loader";
import { it, expect, describe } from "vitest";
import type * as ts from "typescript";
import * as Path from "node:path";
const dir = __dirname;
function createInstance(config: ts.CompilerOptions) {
    return new TsCompilerConfig(dir, {}, config);
}
function parseAlias(instance: TsCompilerConfig, alias: string) {
    for (const res of instance.paseAlias(alias)) {
        return res;
    }
    
}
describe("别名解析", function () {
    it("无base", function () {
        let tsConfig = createInstance({ paths: { "@/*": ["./src/*"] } });
        expect(parseAlias(tsConfig, "@/y")).toBe(Path.resolve(dir, "./src/y"));
    });
    it("有base", function () {
        let tsConfig = createInstance({ baseUrl: "./uk", paths: { "@/*": ["./src/*"] } });
        expect(parseAlias(tsConfig, "@/y")).toBe(Path.resolve(dir, "uk", "./src/y"));
    });
    describe("多种匹配", function () {
        it("匹配扩展名", function () {
            let tsConfig = createInstance({ paths: { "@/*.js": ["./src/*"] } });
            expect(parseAlias(tsConfig, "@/y")).toBeUndefined();
            expect(parseAlias(tsConfig, "@/y.js")).toBe(Path.resolve(dir, "./src/y"));
        });
        it("匹配结果增加字段", function () {
            let tsConfig = createInstance({ paths: { "@/*": ["./src/*/u"] } });
            expect(parseAlias(tsConfig, "@/y")).toBe(Path.resolve(dir, "./src/y/u"));
        });
    });
});
