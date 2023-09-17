import * as Path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Stats } from "node:fs";
import * as fsp from "node:fs/promises";
import { ExtraModule, type ModResolveError, Pkg, requestToNameAndSubPath } from "./common_loader.js";
import { toAbsPath } from "../util/file_tool.js";
import { hookConfig } from "../hook_config.cjs";

/**
 * @remark 如果扩展名以 .ts .js .mjs .cjs ,则尝试替换成对应的ts
 */
async function tryWithoutExt(absRequest: string): Promise<NodeLoader.ResolveFxReturn | undefined> {
    let { ext } = Path.parse(absRequest);
    let absPathWithoutExt = ext === "" ? absRequest : absRequest.slice(0, -ext.length);

    let absPath: string | undefined;
    let format: NodeLoader.Format;
    if (ext === ".mjs") {
        absPath = await tryResolveFile(absPathWithoutExt, [".mts"]);
        format = "module";
    } else if (ext === ".cjs") {
        absPath = await tryResolveFile(absPathWithoutExt, [".cts"]);
        format = "commonjs";
    } else if (ext === ".js") {
        absPath = await tryResolveFile(absPathWithoutExt, [".ts"]);
        if (absPath) {
            format = Pkg.upSearchPkg(absPath)?.defaultFormat ?? "commonjs";
        }
    }
    if (absPath) return { url: pathToFileURL(absPath).toString(), format: format!, shortCircuit: true };
}

/**
 * @remark 尝试添加扩展名搜索
 * @returns absPath
 */
async function tryResolveFile(absPathWithoutExt: string, extList: string[]): Promise<string | undefined> {
    for (const ext of extList) {
        let absPath = absPathWithoutExt + ext;
        let info: Stats;
        try {
            info = await fsp.stat(absPath);
        } catch (error) {
            continue;
        }
        if (info.isFile()) return absPath;
    }
}

async function tryResolveDir(
    path: string,
    nextResolve: NextResolve,
    parentDir: string,
    isCommonJs?: boolean
): Promise<NodeLoader.ResolveFxReturn | undefined> {
    const pkgConfig = ExtraModule._readPackage(path); //node 20 即使不存在也会返回
    if (pkgConfig && pkgConfig.exists !== false) {
        return tryResolvePkg(nextResolve, path, parentDir);
    } else if (isCommonJs) {
        const absPath = await tryResolveFile(Path.resolve(path, "index"), [".ts", ".js", ".json"]);
        if (absPath) {
            let format: NodeLoader.Format =
                ExtraModule._readPackage(absPath)?.type === "module" ? "module" : "commonjs";
            return { url: pathToFileURL(absPath).toString(), format, shortCircuit: true };
        }
    }
}

export async function tryResolvePkg(nextResolve: NextResolve, specifier: string, parentDir: string) {
    try {
        const resolverResult = await nextResolve(specifier);
        return resolverResult;
    } catch (e) {
        const error = e as ModResolveError;
        const result = await errorHandler.forwardError(error, specifier, parentDir, nextResolve);
        if (result) return result;
        throw error;
    }
}

/** 路径模块 */
export async function tryResolvePathMod(
    specifier: string,
    parentDir: string,
    nextResolve: NextResolve,
    isCommonJs?: boolean
): Promise<NodeLoader.ResolveFxReturn | undefined> {
    let absPath: string;
    if (specifier.startsWith(".")) absPath = Path.resolve(parentDir, specifier);
    else if (Path.isAbsolute(specifier)) absPath = specifier;
    else return;

    let resolvedAbsPath: string | undefined;
    const info = await fsp.stat(absPath).catch(() => undefined);

    if (info?.isFile()) resolvedAbsPath = absPath;
    else {
        let result = await tryWithoutExt(absPath);
        if (result) return result;

        resolvedAbsPath = await tryResolveFile(absPath, isCommonJs ? [".ts", ".js", ".json"] : []);

        if (!resolvedAbsPath && info?.isDirectory()) {
            result = await tryResolveDir(absPath, nextResolve, parentDir!, isCommonJs);
            if (result) return result;
        }
    }
    if (!resolvedAbsPath) return;

    const url = pathToFileURL(resolvedAbsPath).toString();
    let format: NodeLoader.Format = (await getTsModuleKind(url)) ?? "commonjs";
    return {
        url,
        format,
        shortCircuit: true,
    };
}

export async function tryTsAlias(
    request: string,
    nextResolve: NextResolve,
    parentDir: string,
    isCommonJs?: boolean
): Promise<NodeLoader.ResolveFxReturn | undefined> {
    const pkg = Pkg.upSearchPkg(parentDir);
    if (!pkg) return;
    const tsConfig = await pkg.getTsConfig();
    if (!tsConfig) return;

    let fileUrl = tsConfig.findAliasCache(request + "\u0000es");
    if (!fileUrl) {
        for (let specifier of tsConfig.paseAlias(request)) {
            const result = await tryResolvePathMod(specifier, parentDir, nextResolve, isCommonJs);
            if (result) {
                tsConfig.setAliasCache(request + "\u0000es", result.url);
                return result;
            }
        }
    }
}

export async function resolveEntryFile(urlString: string): Promise<NodeLoader.ResolveFxReturn | undefined> {
    //入口文件
    let format = await getTsModuleKind(fileURLToPath(urlString)); //format为undefined时说明入口文件不是ts文件
    if (format) {
        return {
            format,
            url: urlString,
            shortCircuit: true,
        };
    }
}
async function getTsModuleKind(filename: string): Promise<NodeLoader.Format | undefined> {
    let ext = filename.match(/\.[cm]?ts$/)?.[0];
    if (ext) {
        if (ext === ".mts") return "module";
        else if (ext === ".cts") return "commonjs";
        else {
            let fileDir = Path.resolve(filename, "..");
            const pkg = Pkg.upSearchPkg(fileDir);
            if (pkg) return pkg.defaultFormat;
            else return "commonjs";
        }
    }
}

type ForwardResult = NodeLoader.ResolveFxReturn | undefined;
/**
 * 通过异常捕获的方式, 可以解析到package.json 中imports 和 exports 字段定义的别名
 */
class EsmErrorHandler {
    async forwardError(
        error: ModResolveError,
        specifier: string,
        parentDir: string,
        nextResolve: NextResolve
    ): Promise<ForwardResult> {
        switch (error.code) {
            case "ERR_MODULE_NOT_FOUND":
                let pkgPath = /^Cannot find package '([^']*)' imported from /.exec(error.message)?.[1];

                if (pkgPath) {
                    let result = this.handlerPkgNotFound(pkgPath, specifier);
                    if (result) return result;
                } else {
                    let resolvedPath = /^Cannot find module '([^']*)' imported from /.exec(error.message)?.[1];
                    if (!resolvedPath) throw error;
                    let result = await this.handlerModuleNotFind(resolvedPath, specifier, parentDir, nextResolve);
                    if (result) return result;
                }

                break;
            default:
                return this.handlerOtherErr(error, specifier, parentDir, nextResolve);
        }
    }
    async handlerOtherErr(
        error: ModResolveError,
        specifier: string,
        parentDir: string,
        nextResolve: NextResolve
    ): Promise<ForwardResult> {
        return;
    }
    async handlerPkgNotFound(pkgPath: string, specifier: string): Promise<ForwardResult> {
        if (pkgPath === specifier) return;
        else {
            const pkgName = requestToNameAndSubPath(specifier)?.pkgName;
            if (pkgName === specifier)
                //只导入包名且 导入的包没有 main 和 exports 字段
                return this.pkgNotFound_mainHandler(pkgPath, specifier);
        }
    }
    async pkgNotFound_mainHandler(pkgPath: string, specifier: string): Promise<ForwardResult> {
        //只导入包名且 导入的包没有 main 和 exports 字段
        let main = Pkg.getPkg(pkgPath)?.main;
        if (!main) return;
        return tryWithoutExt(Path.resolve(pkgPath, main));
    }
    async handlerModuleNotFind(resolvedPath: string, specifier: string, parentDir: string, nextResolve: NextResolve) {
        return tryWithoutExt(resolvedPath);
    }
}
class CommonAdapter extends EsmErrorHandler {
    async handlerModuleNotFind(resolvedPath: string, specifier: string, parentDir: string, nextResolve: NextResolve) {
        let isSubMod;
        if (Path.sep === "\\") isSubMod = resolvedPath.replaceAll("\\", "/").endsWith(specifier);
        else isSubMod = resolvedPath.endsWith(specifier);

        if (isSubMod) {
            //导入没有exports字段的包的子模块
            const pkgName = requestToNameAndSubPath(specifier)!.pkgName;
            const pkgPath = resolvedPath.slice(0, -specifier.length) + Path.sep + pkgName;
            const pkg = Pkg.getPkg(pkgPath);
            if (!pkg) return;
            resolvedPath = Path.resolve(pkg.pkgPath, "..", specifier);
            return tryResolvePathMod(resolvedPath, parentDir, nextResolve, true);
        } else {
            //相对路径导入文件或文件夹
            let absRequestPath = toAbsPath(specifier, parentDir);
            if (absRequestPath) return tryResolvePathMod(absRequestPath, parentDir, nextResolve, true);
            else return super.handlerModuleNotFind(resolvedPath, specifier, parentDir, nextResolve);
        }
    }
    async pkgNotFound_mainHandler(pkgPath: string, specifier: string) {
        //main 和 默认 index
        let main = Pkg.getPkg(pkgPath)?.main ?? "index.js";
        if (!main) return;
        return tryWithoutExt(Path.resolve(pkgPath, main));
    }
    async handlerUnsupportedDirImport(
        message: string,
        parentDir: string,
        nextResolve: NextResolve
    ): Promise<ForwardResult> {
        //导入的包的子模块为目录
        const matchRegExp = /^Directory import '([^']*)' is not supported resolving ES modules imported from /;
        const resolvedPath = matchRegExp.exec(message)?.[1];

        if (!resolvedPath) return;
        return tryResolvePathMod(resolvedPath, parentDir, nextResolve, true);
    }
    async handlerOtherErr(error: ModResolveError, specifier: string, parentDir: string, nextResolve: NextResolve) {
        if (error.code === "ERR_UNSUPPORTED_DIR_IMPORT") {
            return this.handlerUnsupportedDirImport(error.message, parentDir, nextResolve);
        }
        return;
    }
}

const errorHandler = hookConfig.sameParsing ? new CommonAdapter() : new EsmErrorHandler();
export interface NextResolve {
    (specifier: string): Promise<NodeLoader.ResolveFxReturn>;
}
