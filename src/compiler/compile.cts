import { hookConfig } from "../hook_config.cjs";
import { CompileImportError, NoCompileError } from "./errors.cjs";

function tryCompiler(compiler?: "swc" | "tsc") {
    if (compiler !== "tsc") {
        try {
            const { transformSyncUseTsConfig } = require("./swc-complier.cjs") as typeof import("./swc-complier.cjs");
            return transformSyncUseTsConfig;
        } catch (error) {
            if (compiler === "swc") throw new CompileImportError("@swc/core");
        }
    }

    try {
        const { transpileModule } = require("typescript");
        return transpileModule;
    } catch (error) {
        if (compiler === "tsc") throw new CompileImportError("typescript");
    }
    throw new NoCompileError();
}
export const transformSync = tryCompiler(hookConfig.compiler);
