import type ts from "typescript";
import * as sourceMapSupport from "source-map-support";
import { hookConfig } from "../hook_config.cjs";
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
            if (compiler === "swc")
                throw new Error("你选择了swc编译器, 但是无法导入swc-core包, 请确保你已经安装swc-core");
        }
    }

    try {
        const {
            default: { transpileModule },
        } = await import("typescript");
        return async (...args: Parameters<typeof transpileModule>) => transpileModule(...args);
    } catch (error) {
        if (compiler === "tsc")
            throw new Error("你选择了tsc编译器, 但是无法导入 typescript 包, 请确保你已经安装 typescript");
    }

    throw new Error("loader 依赖 typescript 或 swc-core, 你必须至少安装一个编译器");
}
const transform = await tryCompiler(hookConfig.compiler);

export async function compileTsCode(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = await transform(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}
