import * as Path from "node:path";
import Module from "node:module";
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

export function tryFileSync(absPathWithoutExt: string, extList: string[]): string | undefined {
    for (const ext of extList) {
        let absPath = absPathWithoutExt + ext;
        let info: Stats;
        try {
            info = fs.statSync(absPath);
        } catch (error) {
            continue;
        }
        if (info.isFile()) return absPath;
    }
}
function tryDirModSync(path: string) {
    let modPath = tryFileSync(Path.resolve(path, "index"), [".ts"]);
    if (modPath) return modPath;
}
function tryPkgSync(path: string): string | undefined {
    const main = ExtraModule._readPackage(path)?.main;
    if (main) return tryFileSync(Path.resolve(path, main), [".ts"]);
    else return tryDirModSync(path);
}

export function tryTsAliasSync(request: string, parentDir: string): string | undefined {
    const tsConfig = Pkg.upSearchPkg(parentDir)?.getTsConfigSync();
    if (!tsConfig) return;

    let filename = tsConfig.findAliasCache(request + "\u0000c");
    if (filename) return filename;
    for (let tryPath of tsConfig.paseAlias(request)) {
        try {
            const info = fs.statSync(tryPath);

            if (info.isFile()) {
                filename = tryPath;
                break;
            } else if (info.isDirectory()) {
                let extFilename = tryPath + "index";
                filename = tryFileSync(extFilename, [".js", ".ts", ".json"]);
                if (filename) break;
            } else {
                filename = tryWithoutExtSync(tryPath) || tryFileSync(tryPath, [".js", ".ts", ".json"]);
                if (filename) break;
            }
        } catch (error) {
            filename = tryWithoutExtSync(tryPath) || tryFileSync(tryPath, [".js", ".ts", ".json"]);
            if (filename) break;
        }
    }
    if (filename) {
        tsConfig.setAliasCache(request + "\u0000c", filename);
        return filename;
    }
}
