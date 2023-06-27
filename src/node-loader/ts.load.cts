import BuiltinModule from "node:module";
import { readFileSync } from "node:fs";
import { ModuleKind } from "./util/tslib.js";
import { DEFAULT_OPTIONS } from "./hook_config.cjs";
import type ts from "typescript";

function tryCompiler(compiler?: "swc" | "tsc") {
    if (compiler !== "tsc") {
        try {
            const { transformSyncUseTsConfig } =
                require("./compiler/swc-complier.cjs") as typeof import("./compiler/swc-complier.cjs");
            return transformSyncUseTsConfig;
        } catch (error) {
            if (compiler === "swc")
                throw new Error("你选择了swc编译器, 但是无法导入swc-core包, 请确保你已经安装swc-core");
        }
    }

    try {
        const { transpileModule } = require("typescript");
        return transpileModule;
    } catch (error) {
        if (compiler === "tsc")
            throw new Error("你选择了tsc编译器, 但是无法导入 typescript 包, 请确保你已经安装 typescript");
    }

    throw new Error("loader 依赖 typescript 或 swc-core, 你必须至少安装一个编译器");
}
const transformSync = tryCompiler();

function compileTsCodeSync(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = transformSync(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}

const Module: Record<string, any> = BuiltinModule;

function tsc(this: typeof Module, module: typeof Module, fileName: string) {
    const code = compileTsCodeSync(readFileSync(fileName, "utf-8"), fileName, {
        ...DEFAULT_OPTIONS,
        module: ModuleKind.NodeNext, //node import() 支持
    });

    module._compile(code, fileName);
}
Module._extensions[".ts"] = tsc;
Module._extensions[".cts"] = tsc;
