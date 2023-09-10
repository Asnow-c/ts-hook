import Module from "node:module";
import { fileURLToPath } from "url";
import { isTsPath as isTsUrl } from "./util/tslib.js";
import { resolveEntryFile, tryTsAlias, tryResolvePathMod, NextResolve, tryResolvePkg } from "./internal/esm_loader.mjs";
import { hookConfig } from "./hook_config.cjs";
import * as Path from "node:path";

class ResolveEsCache {
    private static esCache = new Map<string, { url: string; format?: NodeLoader.Format } | null>();
    static tryCache(parentDir: string, specifier: string): NodeLoader.ResolveFxReturn | undefined {
        let res = this.esCache.get(parentDir + "\u0000" + specifier);
        if (res) return { ...res, shortCircuit: true };
    }
    static setCache<T extends NodeLoader.ResolveFxReturn | null>(parentDir: string, specifier: string, res: T): T {
        let cacheVal = res ? { format: res.format, url: res.url } : res;
        this.esCache.set(parentDir + "\u0000" + specifier, cacheVal);

        return res;
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
    const paseNextResolve: NextResolve = (specifier) => nextResolve(specifier, context);

    //查找缓存
    let result = ResolveEsCache.tryCache(parentDir, specifier);
    if (result) return result;
    else if (result === null) return paseNextResolve(specifier);

    //路径导入
    result = await tryResolvePathMod(specifier, parentDir, paseNextResolve, hookConfig.sameParsing);
    //路径别名
    if (!result) result = await tryTsAlias(specifier, paseNextResolve, parentDir, hookConfig.sameParsing);
    //包名、包imports
    if (!result) result = await tryResolvePkg(paseNextResolve, specifier, parentDir);
    return ResolveEsCache.setCache(parentDir, specifier, result);
}
