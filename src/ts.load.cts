import BuiltinModule from "node:module";
import { readFileSync } from "node:fs";
import { ModuleKind } from "./util/tslib.js";
import { createCompilerOption } from "./hook_config.cjs";
import type ts from "typescript";
import { transformSync } from "./compiler/compile.cjs";
import { Pkg } from "./internal/common_loader.js";

function compileTsCodeSync(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = transformSync(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}

const Module: Record<string, any> = BuiltinModule;

function tsc(this: typeof Module, module: typeof Module, fileName: string) {
    const pkg = Pkg.upSearchPkg(fileName);
    const pkgConfig = pkg?.getTsConfigSync()?.baseCompileOptions ?? {};
    const config = createCompilerOption(ModuleKind.NodeNext, pkgConfig);
    const code = compileTsCodeSync(readFileSync(fileName, "utf-8"), fileName, config);

    module._compile(code, fileName);
}
Module._extensions[".ts"] = tsc;
Module._extensions[".cts"] = tsc;
