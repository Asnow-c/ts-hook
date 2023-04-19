import * as Path from "node:path";
import Module from "node:module";
import { pathToFileURL } from "node:url";
import type { Stats } from "node:fs";
import * as fs from "node:fs";
import { Pkg } from "./common_loader.mjs";
import { ERR_REQUIRE_ESM } from "./errors/error.mjs";
export const ExtraModule = Module as ExtraModule;

export function tryWithoutExtSync(absPath: string) {
    let { ext } = Path.parse(absPath);
    let absPathWithoutExt = ext === "" ? absPath : absPath.slice(0, -ext.length);

    let filename: string | undefined;
    if (ext === ".mjs") throw new ERR_REQUIRE_ESM(absPath, true);
    else if (ext === ".cjs") filename = tryFileSync(absPathWithoutExt, [".cts"]);
    else if (ext === ".js") {
        filename = tryFileSync(absPathWithoutExt, [".ts"]);
        if (filename && Pkg.upSearchPkg(filename)?.type === "module") throw new ERR_REQUIRE_ESM(absPath, true);
    }
    return filename;
}

export function tryFileSync(absPathWithoutExt: string, extList = [".js", ".ts"]): string | undefined {
    let tryDir: string[] = [];
    for (const ext of extList) {
        let absPath = absPathWithoutExt + ext;
        let info: Stats;
        try {
            info = fs.statSync(absPath);
        } catch (error) {
            continue;
        }
        if (info.isFile()) return absPath;
        else if (info.isDirectory()) tryDir.push(absPath);
    }
    for (const dir of tryDir) {
        let filename = tryPkgSync(dir);
        if (filename) return filename;
    }
}
function tryDirModSync(path: string) {
    let modPath = tryFileSync(Path.resolve(path, "index"));
    if (modPath) return modPath;
}
export function tryPkgSync(path: string): string | undefined {
    const main = ExtraModule._readPackage(path)?.main;
    if (main) return tryFileSync(Path.resolve(path, main));
    else return tryDirModSync(path);
}
