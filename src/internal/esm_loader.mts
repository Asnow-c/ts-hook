import * as Path from "node:path";
import Module from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Stats } from "node:fs";
import * as fsp from "node:fs/promises";
export const ExtraModule = Module as ExtraModule;

//cjs和mjs扩展名规则
export async function tryWithoutExt(absRequest: string): Promise<ResolveFxReturn | undefined> {
    let { ext } = Path.parse(absRequest);
    let absPathWithoutExt = ext === "" ? absRequest : absRequest.slice(0, -ext.length);

    let fileUrl: string | undefined;
    let format: PkgFormat;
    if (ext === ".mjs") {
        fileUrl = await tryFile(absPathWithoutExt, [".mts"]);
        format = "module";
    } else if (ext === ".cjs") {
        fileUrl = await tryFile(absPathWithoutExt, [".cts"]);
        format = "commonjs";
    } else if (ext === ".js") {
        fileUrl = await tryFile(absPathWithoutExt, [".ts"]);
        if (fileUrl) {
            format = ExtraModule._readPackage(fileURLToPath(fileUrl))?.type === "module" ? "module" : "commonjs";
        }
    }
    if (fileUrl) return { url: fileUrl, format: format!, shortCircuit: true };
}

export async function tryFile(absPathWithoutExt: string, extList: string[]): Promise<string | undefined> {
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
        let fileUrl = await tryPkg(dir);
        if (fileUrl) return fileUrl;
    }
}
async function tryDirMod(path: string) {
    let modPath = await tryFile(Path.resolve(path, "index"), [".js", ".ts"]);
    if (modPath) return modPath;
}
export async function tryPkg(path: string): Promise<string | undefined> {
    const main = ExtraModule._readPackage(path)?.main;
    if (main) return tryFile(Path.resolve(path, main), [".ts"]);
    else return tryDirMod(path);
}
