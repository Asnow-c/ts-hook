import BuiltinModule from "node:module";
import { readFileSync } from "node:fs";
import { ModuleKind } from "./util/tslib.js";
import { DEFAULT_OPTIONS } from "./hook_config.cjs";
import type ts from "typescript";
import { transformSync } from "./compiler/compile.cjs";

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
