import { it, describe, expect, vi, Mock } from "vitest";
import * as Path from "node:path";
import {
    jsonToTsConfig,
    ScriptTarget,
    ModuleResolutionKind,
    readTsConfigFile,
    readTsConfigFileSync,
    TsConfig,
} from "./tslib.js";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
describe("toConfig", function () {
    it("target", function () {
        expect(jsonToTsConfig({ target: "esNext" }), "混合1").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "ESNext" }), "混合2").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "ESNEXT" }), "全部大写").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "esnext" }), "全部小写").toEqual({ target: ScriptTarget.ESNext });
        expect(jsonToTsConfig({ target: "json" })).toEqual({ target: ScriptTarget.JSON });
    });
    it("混合", function () {
        expect(
            jsonToTsConfig({
                target: "es2020",
                strict: true,
                moduleResolution: "nodeNext",
            })
        ).toEqual({
            target: ScriptTarget.ES2020,
            strict: true,
            moduleResolution: ModuleResolutionKind.NodeNext,
        });
    });
});
vi.mock("node:fs", function () {
    return { readFileSync: vi.fn() };
});
vi.mock("node:fs/promises", function () {
    return { readFile: vi.fn() };
});

describe("readTsConfigFile", function () {
    const mockTsConfigFsImp = (path: string) => {
        path = Path.resolve(path);
        if (path === Path.resolve("/tsconfig.json"))
            return JSON.stringify({
                compilerOptions: { target: "es2022", lib: ["dom"], out: "./out" },
            } as TsConfig);
        else if (path === Path.resolve("/cc/tsconfig.json"))
            return JSON.stringify({
                extends: "../tsconfig.json",
                compilerOptions: { lib: [], strict: true },
            } as TsConfig);

        throw new Error("not found:" + path);
    };
    const expectObj = { target: ScriptTarget.ES2022, lib: [], out: "./out", strict: true };
    it("同步单继承", function () {
        const mockReadFileSync = fs.readFileSync as Mock<any, any>;
        mockReadFileSync.mockImplementation(mockTsConfigFsImp);

        const compilerOptions = readTsConfigFileSync("/cc/tsconfig.json");
        expect(compilerOptions).toEqual(expectObj);
    });
    it("同步单继承", async function () {
        const mockReadFile = fsp.readFile as Mock<any, any>;
        mockReadFile.mockImplementation(async (...args: Parameters<typeof mockTsConfigFsImp>) =>
            mockTsConfigFsImp(...args)
        );

        const compilerOptions = await readTsConfigFile("/cc/tsconfig.json");
        expect(compilerOptions).toEqual(expectObj);
    });
});
