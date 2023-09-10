import type ts from "typescript";
import * as sourceMapSupport from "source-map-support";
import { hookConfig } from "../hook_config.cjs";
import { CompileImportError, NoCompileError } from "./errors.cjs";

export const SourcemapMap = new Map();
(sourceMapSupport as any).install({
    // handleUncaughtExceptions: false,
    environment: "node",
    hookRequire: true,
    retrieveSourceMap(filename: string) {
        if (SourcemapMap.has(filename)) {
            return {
                url: filename,
                map: SourcemapMap.get(filename),
            };
        }
        return null;
    },
});
async function tryCompiler(compiler?: "swc" | "tsc") {
    if (compiler !== "tsc") {
        try {
            const { transformUseTsConfig } = await import("./swc-complier.cjs");
            return transformUseTsConfig;
        } catch (error) {
            if (compiler === "swc") throw new CompileImportError("@swc/core");
        }
    }

    try {
        const {
            default: { transpileModule },
        } = await import("typescript");
        return async (...args: Parameters<typeof transpileModule>) => transpileModule(...args);
    } catch (error) {
        if (compiler === "tsc") throw new CompileImportError("typescript");
    }

    throw new NoCompileError();
}
const transform = await tryCompiler(hookConfig.compiler);

export async function compileTsCode(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = await transform(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}
