import BuiltinModule from "node:module";
import { readFileSync } from "node:fs";
import { compileTsCode, compileTsCodeSync } from "./compiler/compile.mjs";
import { ModuleKind, isTsPath } from "./util/tslib.mjs";
import { DEFAULT_OPTIONS } from "./hook_config.mjs";

const Module: Record<string, any> = BuiltinModule;

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
                code = await compileTsCode(source, url, { ...DEFAULT_OPTIONS, module: ModuleKind.ESNext });
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

function tsc(this: typeof Module, module: typeof Module, fileName: string) {
    const code = compileTsCodeSync(readFileSync(fileName, "utf-8"), fileName, {
        ...DEFAULT_OPTIONS,
        module: ModuleKind.NodeNext, //node import() 支持
    });

    module._compile(code, fileName);
}
Module._extensions[".ts"] = tsc;
Module._extensions[".cts"] = tsc;
