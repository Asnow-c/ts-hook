import Module from "node:module";
import { fileURLToPath } from "url";
import { isTsPath as isTsUrl } from "../util/tslib.mjs";
import { ExtraModule, resolveEntryFile, tryTsAlias, EsmErrorHandler, CommonAdapter } from "../internal/esm_loader.mjs";
import { tryTsAliasSync, tryWithoutExtSync } from "../internal/cjs_loader.mjs";
import { ModResolveError } from "../internal/common_loader.mjs";
import { hookConfig } from "../util/hook_config.mjs";
import { toAbsPath } from "../util/file_tool.mjs";

const errorHandler = hookConfig.sameParsing ? new CommonAdapter() : new EsmErrorHandler();

export async function resolve(
    specifier: string,
    context: ResolveContext,
    nextResolve: NextResolveFx
): Promise<ResolveFxReturn> {
    const { parentURL } = context;

    if (!parentURL) {
        //入口文件
        let result = await resolveEntryFile(specifier);
        if (result) return result;
        return nextResolve(specifier, context);
    }
    //只处理ts文件的导入
    if (!isTsUrl(parentURL) || Module.isBuiltin(specifier)) return nextResolve(specifier, context);

    let error: ModResolveError;
    try {
        const resolverResult = await nextResolve(specifier, context);
        return resolverResult;
    } catch (e) {
        error = e as ModResolveError;
        const result = await errorHandler.forwardError(error, specifier, parentURL);
        if (result) return result;
    }
    if (hookConfig.enableTsAlias) {
        let result = await tryTsAlias(specifier, fileURLToPath(parentURL));
        if (result) return result;
    }
    throw error;
}
const rawResolveFilename = ExtraModule._resolveFilename;
ExtraModule._resolveFilename = function _resolveFilename(
    this: ExtraModule,
    request: string,
    parent: Module,
    isMain: boolean
): string | undefined {
    //只处理ts文件的导入
    if (!parent || !isTsUrl(parent.filename)) return rawResolveFilename.apply(this, arguments as any);
    let absRequest = toAbsPath(request, parent.path);

    if (absRequest) {
        let filename = tryWithoutExtSync(absRequest);
        if (filename) return filename;
        return rawResolveFilename.apply(this, arguments as any);
    } else {
        //处理包
        let error: ModResolveError;
        try {
            return rawResolveFilename.apply(this, arguments as any);
        } catch (e) {
            error = e as ModResolveError;
            if (error.code !== "MODULE_NOT_FOUND") throw error;
        }

        let groups =
            /^Cannot find module '(?<resolvedPath>[^']*)'(?<isMain>. Please verify that the package.json has a valid "main" entry)?/.exec(
                error.message
            )?.groups;
        let pkgPath = error.path;
        if (!groups || !pkgPath) throw error;
        const { resolvedPath, isMain } = groups;

        let filename = tryWithoutExtSync(resolvedPath);
        if (filename) return filename;

        if (hookConfig.enableTsAlias) {
            let pathname = tryTsAliasSync(request, parent.path);
            if (pathname) return pathname;
        }
        throw error;
    }
};
