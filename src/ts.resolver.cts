import Module from "node:module";
import { isTsPath as isTsUrl } from "./util/tslib.js";
import { tryTsAliasSync, tryWithoutExtSync } from "./internal/cjs_loader.cjs";
import { ExtraModule, ModResolveError } from "./internal/common_loader.js";
import { toAbsPath } from "./util/file_tool.js";

class ResolveCjsCache {
    private static cjsCache = new Map<string, string | null>();
    static tryCache(parentDir: string, request: string) {
        return this.cjsCache.get(parentDir + "\u0000" + request);
    }
    static setCache<T extends string | null>(parentDir: string, request: string, filename: T): T {
        this.cjsCache.set(parentDir + "\u0000" + request, filename);
        return filename;
    }
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

    let filename = ResolveCjsCache.tryCache(parentDir, request);
    if (filename) return filename;

    let absRequest = toAbsPath(request, parentDir);
    if (absRequest) {
        let filename = tryWithoutExtSync(absRequest);
        if (filename) return ResolveCjsCache.setCache(parentDir, request, filename);
        return rawResolveFilename.apply(this, arguments as any);
    } else {
        //处理包
        let error: ModResolveError;
        try {
            return rawResolveFilename.apply(this, arguments as any);
        } catch (e) {
            error = e as ModResolveError;
            if (error.code !== "MODULE_NOT_FOUND") {
                ResolveCjsCache.setCache(parentDir, request, null);
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
            if (filename) return ResolveCjsCache.setCache(parentDir, request, filename);
        }

        {
            let filename = tryTsAliasSync(request, parent.path);
            if (filename) return ResolveCjsCache.setCache(parentDir, request, filename);
        }

        ResolveCjsCache.setCache(parentDir, request, null);
        throw error;
    }
};
