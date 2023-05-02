import Module from "node:module";
import { fileURLToPath } from "url";
import { isTsPath as isTsUrl } from "./util/tslib.mjs";
import { resolveEntryFile, tryTsAlias, EsmErrorHandler, CommonAdapter } from "./internal/esm_loader.mjs";
import { tryTsAliasSync, tryWithoutExtSync } from "./internal/cjs_loader.mjs";
import { ExtraModule, ModResolveError } from "./internal/common_loader.mjs";
import { hookConfig } from "./hook_config.mjs";
import { toAbsPath } from "./util/file_tool.mjs";
import * as Path from "node:path";

const errorHandler = hookConfig.sameParsing ? new CommonAdapter() : new EsmErrorHandler();

class ResolveCache {
    private static esCache = new Map<string, { url: string; format?: NodeLoader.Format } | null>();
    private static cjsCache = new Map<string, string | null>();
    static tryEsCache(parentDir: string, specifier: string): NodeLoader.ResolveFxReturn | undefined {
        let res = ResolveCache.esCache.get(parentDir + "\u0000" + specifier);
        if (res) return { ...res, shortCircuit: true };
    }
    static setEsCache<T extends NodeLoader.ResolveFxReturn | null>(parentDir: string, specifier: string, res: T): T {
        let cacheVal = res ? { format: res.format, url: res.url } : res;
        ResolveCache.esCache.set(parentDir + "\u0000" + specifier, cacheVal);

        return res;
    }
    static tryCjsCache(parentDir: string, request: string) {
        return ResolveCache.cjsCache.get(parentDir + "\u0000" + request);
    }
    static setCjsCache<T extends string | null>(parentDir: string, request: string, filename: T): T {
        ResolveCache.cjsCache.set(parentDir + "\u0000" + request, filename);
        return filename;
    }
}

export async function resolve(
    specifier: string,
    context: NodeLoader.ResolveContext,
    nextResolve: NodeLoader.NextResolveFx
): Promise<NodeLoader.ResolveFxReturn> {
    const { parentURL } = context;

    if (!parentURL) {
        //入口文件
        const result = await resolveEntryFile(specifier);
        if (result) return result;
        return nextResolve(specifier, context);
    }
    //只处理ts文件的导入
    if (!isTsUrl(parentURL) || Module.isBuiltin(specifier)) return nextResolve(specifier, context);

    const parentFilename = fileURLToPath(parentURL);
    const parentDir = Path.resolve(parentFilename, "..");

    //查找缓存
    const result = ResolveCache.tryEsCache(parentDir, specifier);
    if (result) return result;
    else if (result === null) return nextResolve(specifier, context);

    let error: ModResolveError;
    try {
        const resolverResult = await nextResolve(specifier, context);
        return resolverResult;
    } catch (e) {
        error = e as ModResolveError;
        const result = await errorHandler.forwardError(error, specifier, parentURL);
        if (result) return ResolveCache.setEsCache(parentDir, specifier, result);
    }
    {
        const result = await tryTsAlias(specifier, parentDir, [".js", ".ts", ".json"], true);
        if (result) return ResolveCache.setEsCache(parentDir, specifier, result);
    }
    ResolveCache.setEsCache(parentDir, specifier, null);
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
    if (!parent || !isTsUrl(parent.filename) || Module.isBuiltin(request))
        return rawResolveFilename.apply(this, arguments as any);
    const parentDir = parent.path;

    let filename = ResolveCache.tryCjsCache(parentDir, request);
    if (filename) return filename;

    let absRequest = toAbsPath(request, parentDir);
    if (absRequest) {
        let filename = tryWithoutExtSync(absRequest);
        if (filename) return ResolveCache.setCjsCache(parentDir, request, filename);
        return rawResolveFilename.apply(this, arguments as any);
    } else {
        //处理包
        let error: ModResolveError;
        try {
            return rawResolveFilename.apply(this, arguments as any);
        } catch (e) {
            error = e as ModResolveError;
            if (error.code !== "MODULE_NOT_FOUND") {
                ResolveCache.setCjsCache(parentDir, request, null);
                throw error;
            }
        }

        let groups =
            /^Cannot find module '(?<resolvedPath>[^']*)'(?<isMain>. Please verify that the package.json has a valid "main" entry)?/.exec(
                error.message
            )?.groups;
        let pkgPath = error.path;
        if (groups && pkgPath) {
            const { resolvedPath, isMain } = groups;
            let filename = tryWithoutExtSync(resolvedPath);
            if (filename) return ResolveCache.setCjsCache(parentDir, request, filename);
        }

        {
            let filename = tryTsAliasSync(request, parent.path);
            if (filename) return ResolveCache.setCjsCache(parentDir, request, filename);
        }

        ResolveCache.setCjsCache(parentDir, request, null);
        throw error;
    }
};
