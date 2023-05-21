import { compileTsCode } from "./compiler/compile.mjs";
import { ModuleKind, isTsPath } from "./util/tslib.js";
import { DEFAULT_OPTIONS } from "./hook_config.cjs";

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
