import { compileTsCode } from "./compiler/compile.mjs";
import { ModuleKind, isTsPath } from "./util/tslib.js";
import { createCompilerOption } from "./hook_config.cjs";
import { Pkg } from "./internal/common_loader.js";
import { fileURLToPath } from "url";
import type * as ts from "typescript";

export async function load(
    url: string,
    context: NodeLoader.LoadContext,
    nextLoad: NodeLoader.NextLoadFx
): Promise<NodeLoader.LoadReturn> {
    const { format } = context;
    if (format) {
        if (format === "commonjs") {
            return {
                format,
                shortCircuit: true,
            };
        } else if (format === "module" && isTsPath(url)) {
            let { source } = await nextLoad(url, context);
            let code: string | undefined;
            if (source) {
                source = source.toString();
                let pkgConfig: ts.CompilerOptions;
                {
                    const pkg = Pkg.upSearchPkg(fileURLToPath(url));
                    if (pkg) pkgConfig = (await pkg.getTsConfig())?.baseCompileOptions ?? {};
                    else pkgConfig = {};
                }
                const config = createCompilerOption(ModuleKind.NodeNext, pkgConfig);
                code = await compileTsCode(source, url, createCompilerOption(ModuleKind.ESNext, config));
            }
            return {
                format,
                source: code,
                shortCircuit: true,
            };
        }
    }

    return nextLoad(url, context);
}
