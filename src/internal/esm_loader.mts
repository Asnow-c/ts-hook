import * as Path from "node:path";
import Module from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Stats } from "node:fs";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { upSearch } from "../util/file_tool.mjs";
export const ExtraModule = Module as ExtraModule;

export function createEsmNotFoundErr(request: string, path: string) {
    // eslint-disable-next-line no-restricted-syntax
    const err: Error & { code: string; path: string } = new Error(`Cannot find module '${request}'`) as any;
    err.code = "MODULE_NOT_FOUND";
    if (path) err.path = path;
    // TODO(BridgeAR): Add the requireStack as well.
    return err;
}

type ReadPackageScopeRes = {
    data: PackageConfig;
    path: string;
};
export function readPackageScope(checkPath: string): ReadPackageScopeRes | undefined {
    for (let path of upSearch(checkPath)) {
        const pjson = ExtraModule._readPackage(path + Path.sep);
        if (pjson)
            return {
                data: pjson,
                path: checkPath,
            };
    }
    return;
}
/**
 * todo
 */
export function aliasToFilename(alias: string, parentPath: string): ResolveFxReturn | undefined {
    let pathname = ExtraModule._resolveFilename(alias, { filename: parentPath, paths: [] } as any, false);
    if (pathname) {
        const data = readPackageScope(pathname)?.data;
        return { url: pathToFileURL(pathname).toString(), format: data?.type === "module" ? "module" : "commonjs" };
    }
}
export async function resolvePackage(request: string, parentPath: string): Promise<undefined | ResolveFxReturn> {
    let data = await trySelf(request, parentPath);
    if (data) return { ...data, shortCircuit: true };

    let pathname = await findPath(request, parentPath);
    if (pathname) {
        return {
            format: ExtraModule._readPackage(pathname)?.type === "module" ? "module" : "commonjs",
            url: pathToFileURL(pathname).toString(),
            shortCircuit: true,
        };
    }
}

export function tryWithoutExtSync(absRequest: string) {
    let { ext } = Path.parse(absRequest);
    let absPathWithoutExt = ext === "" ? absRequest : absRequest.slice(0, -ext.length);

    if (ext === ".cjs" || ext === ".js") {
        for (const item of [ext, ext.replace("j", "t")]) {
            let filename = absPathWithoutExt + item;
            let info: Stats;
            try {
                info = fs.statSync(filename);
            } catch (error) {
                continue;
            }
            if (info.isFile()) {
                if (item === "ext") break;
                else return filename;
            }
        }
    }
}

//cjs和mjs扩展名规则
export async function tryWithoutExt(absRequest: string): Promise<ResolveFxReturn | undefined> {
    let { ext } = Path.parse(absRequest);
    let absPathWithoutExt = ext === "" ? absRequest : absRequest.slice(0, -ext.length);

    let fileUrl: string | undefined;
    let format: PkgFormat;
    if (ext === ".mjs") {
        fileUrl = await tryFile(absPathWithoutExt, [ext, ".mts"]);
        format = "module";
    } else if (ext === ".cjs") {
        fileUrl = await tryFile(absPathWithoutExt, [ext, ".cts"]);
        format = "commonjs";
    } else if (ext === ".js") {
        fileUrl = await tryFile(absPathWithoutExt);
        if (fileUrl) {
            format = ExtraModule._readPackage(fileURLToPath(fileUrl))?.type === "module" ? "module" : "commonjs";
        }
    }
    if (fileUrl) return { url: fileUrl, format: format!, shortCircuit: true };
}

export async function tryFile(absPathWithoutExt: string, extList = [".js", ".ts"]): Promise<string | undefined> {
    let tryDir: string[] = [];
    for (const ext of extList) {
        let absPath = absPathWithoutExt + ext;
        let info: Stats;
        try {
            info = await fsp.stat(absPath);
        } catch (error) {
            continue;
        }
        if (info.isFile()) return pathToFileURL(absPath).toString();
        else if (info.isDirectory()) tryDir.push(absPath);
    }
    for (const dir of tryDir) {
        let pathname = await tryPkg(dir);
        if (pathname) return pathToFileURL(pathname).toString();
    }
}
async function tryDirMod(path: string) {
    let modPath = await tryFile(Path.resolve(path, "index"));
    if (modPath) return modPath;
}
async function tryPkg(path: string): Promise<string | undefined> {
    const main = readPackageScope(path)?.data?.main;
    if (main) return tryFile(Path.resolve(path, main));
    else return tryDirMod(path);
}
export async function trySelf(
    request: string,
    parentPath: string
): Promise<{ format: PkgFormat; url: string } | undefined> {
    let pkgInfo = ExtraModule._readPackage(parentPath);
    if (!pkgInfo || !request.startsWith(pkgInfo.name)) return;
    let result = await findAndReadPackageJson(parentPath);
    if (!result) return;

    let pathname = ExtraModule._findPath(request, [Path.resolve(result.path, "..")], false);
    if (pathname) {
        return { format: pkgInfo.type === "module" ? "module" : "commonjs", url: pathToFileURL(pathname).toString() };
    }
}
export async function findAndReadPackageJson(
    checkPath: string
): Promise<{ data: PackageConfig; path: string } | undefined> {
    for (const path of upSearch(checkPath)) {
        let res = ExtraModule._readPackage(path);
        if (res) {
            return {
                data: res,
                path: path + "/package.json",
            };
        }
    }
}
async function findPath(request: string, parentPath: string): Promise<string | undefined> {
    const absoluteRequest = Path.isAbsolute(request);
    let paths: string[] = [];
    if (!absoluteRequest) {
        paths = ExtraModule._resolveLookupPaths(request, { paths: [], id: "", filename: "" } as any);

        let split = parentPath.split(Path.sep);
        let modules = "node_modules";
        if (split.length) paths.unshift(split[0] + Path.sep + modules);

        for (let i = 1; i < split.length; i++) {
            split[i] = split[i - 1] + Path.sep + split[i];
            paths.unshift(split[i] + Path.sep + modules);
        }
    }

    let pathname = ExtraModule._findPath(request, paths, false);
    if (pathname) return pathname;
}
