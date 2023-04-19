import Module from "node:module";
import { fileURLToPath } from "url";
import * as Path from "path";
import { isTsPath as isTsUrl } from "../util/tslib.mjs";
import { ExtraModule, tryFile, tryWithoutExt } from "../internal/esm_loader.mjs";
import { tryWithoutExtSync } from "../internal/cjs_loader.mjs";
import { CodeError } from "../internal/errors/error.mjs";
import { Pkg } from "../internal/common_loader.mjs";

export async function resolve(
    specifier: string,
    context: ResolveContext,
    nextResolve: NextResolveFx
): Promise<ResolveFxReturn> {
    const { parentURL } = context;

    if (!parentURL) {
        //入口文件
        const url = specifier;
        let format = await getTsModule(fileURLToPath(url)); //format为undefined时说明入口文件不是ts文件
        if (format) {
            return {
                format,
                url,
                shortCircuit: true,
            };
        }
    } else if (isTsUrl(parentURL) && !Module.isBuiltin(specifier)) {
        let error: ModResolveError;
        let resolvedPath: string | undefined;
        try {
            const result = await nextResolve(specifier, context);
            return result;
        } catch (e) {
            error = e as ModResolveError;
            switch (error.code) {
                case "ERR_MODULE_NOT_FOUND":
                    let pkgPath = /^Cannot find package '([^']*)' imported from /.exec(error.message)?.[1];

                    if (pkgPath) {
                        if (pkgPath === specifier) throw error;
                        else {
                            //只导入包名且 导入的包没有 main 和 exports 字段
                            //main 和 默认 index
                            let main = Pkg.getPkg(pkgPath)?.main ?? "index.js";
                            if (!main) throw error;
                            resolvedPath = Path.resolve(pkgPath, main);

                            let result = await tryWithoutExt(resolvedPath);
                            if (result) return result;
                            throw error;
                        }
                    }

                    resolvedPath = /^Cannot find module '([^']*)' imported from /.exec(error.message)?.[1];
                    if (!resolvedPath) throw error;

                    let isSubMod;
                    if (Path.sep === "\\") isSubMod = resolvedPath.replaceAll("\\", "/").endsWith(specifier);
                    else isSubMod = resolvedPath.endsWith(specifier);

                    if (isSubMod) {
                        //导入没有exports字段的包的子模块
                        //todo:
                        const pkg = Pkg.upSearchPkg(resolvedPath);
                        if (!pkg) throw error;
                        resolvedPath = Path.resolve(pkg.pkgPath, "..", specifier);
                    } else {
                        //相对路径导入文件或文件夹

                        const parentDir = Path.resolve(fileURLToPath(parentURL), "..");
                        let absRequestPath = toAbsPath(specifier, parentDir);
                        if (absRequestPath) resolvedPath = absRequestPath;
                        else {
                            //导入包且有存在exports字段
                        }
                    }
                    break;
                case "ERR_UNSUPPORTED_DIR_IMPORT":
                    //导入的包的子模块为目录
                    resolvedPath =
                        /^Directory import '([^']*)' is not supported resolving ES modules imported from /.exec(
                            error.message
                        )?.[1];

                    if (!resolvedPath) throw error;
                    break;
                default:
                    throw error;
            }
        }

        if (resolvedPath) {
            let result = await tryWithoutExt(resolvedPath);
            if (result) return result;

            let filename = await tryFile(resolvedPath, ["", ".ts"]);
            if (!filename) throw error;

            let format: PkgFormat =
                ExtraModule._readPackage(fileURLToPath(filename!))?.type === "module" ? "module" : "commonjs";
            return {
                url: filename!,
                format,
                shortCircuit: true,
            };
        }
    }
    let data = await nextResolve(specifier, context);
    return data;
}
type ModResolveError = CodeError & { path?: string; requireStack?: string[] };
const rawResolveFilename = ExtraModule._resolveFilename;
ExtraModule._resolveFilename = function _resolveFilename(
    this: ExtraModule,
    request: string,
    parent: Module,
    isMain: boolean
): string | undefined {
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
        const pkg = Pkg.getPkg(pkgPath);
        throw error;
    }
};

/**
 * @returns undefined: 请求不是路径  string: 绝对路径
 */
function toAbsPath(request: string, parentPath: string) {
    let isRel = request === "." || request === ".." || /^\.\.?[\\\/]/.test(request);
    if (isRel) return Path.resolve(parentPath, request);
    if (Path.isAbsolute(request)) return request;
}

async function getTsModule(filename: string): Promise<PkgFormat | undefined> {
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
