import * as path from "node:path";
import * as fs from "node:fs";
import type { CompilerOptions } from "typescript";
import { paseConfigOptions } from "./util/tslib.mjs";

export class Pkg {
    private static loadedPkgMap = new Map<string, Pkg>();

    static findPkgCache(filename: string) {
        return this.loadedPkgMap.get(filename);
    }
    static searchFilePkg(filename: string, defaultOption: CompilerOptions) {
        let dir = filename;
        let pkg: Pkg | undefined;
        do {
            dir = path.resolve(dir, "..");
            pkg = this.loadedPkgMap.get(dir);
            if (pkg) return pkg;
            let absPath = path.resolve(dir, "package.json");
            if (!fs.existsSync(absPath)) continue;

            let json: any = {};
            try {
                json = JSON.parse(fs.readFileSync(absPath, "utf-8"));
            } catch (error) {}
            const tsconfigPath = path.resolve(dir, "tsconfig.json");
            let options = defaultOption;
            if (fs.existsSync(tsconfigPath)) options = paseConfigOptions(fs.readFileSync(tsconfigPath, "utf-8"), dir);
            pkg = new this(dir, json, options);
            this.loadedPkgMap.set(filename, pkg);

            return pkg;
        } while (!dir.endsWith(path.sep));
        return null;
    }
    private static findExt(request: string, extList: string[]): string | undefined {
        for (const ext of extList) {
            let file = request + ext;
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
                return file;
            }
        }
    }
    static findFile(absPath: string, extList: string[]) {
        if (fs.existsSync(absPath)) {
            let rc = fs.statSync(absPath);
            if (rc.isFile()) return absPath;
            if (rc.isDirectory()) absPath = path.resolve(absPath, "index");
        }
        return this.findExt(absPath, extList);
    }
    readonly type: string;
    readonly basicUrl: string;
    private alias = new Map<RegExp, string[]>();
    constructor(pkgDir: string, json: Record<string, string>, private options: CompilerOptions) {
        this.basicUrl = pkgDir;
        this.type = json.type;
        const tsPaths = options.paths;
        if (!tsPaths) return;
        const alias = this.alias;
        for (const key of Object.keys(tsPaths)) {
            const split = key.replace(/\*/, "(.*)");
            alias.set(new RegExp(split), tsPaths[key]);
        }
    }
    private aliasCache = new Map<string, string>();
    findAliasCache(importer: string, alias: string) {
        return this.aliasCache.get(path.resolve(importer, "..") + "\x00" + alias);
    }
    paseAlias(importer: string, alias: string) {
        let extListC = [".js", ".cjs", ".ts", ".cts", ".json", ".node"];
        const dirTest = ["package.json", "main", "index", "index"];
        const options = this.options;
        for (const [regExp, maps] of this.alias) {
            const vab = alias.match(regExp)?.[1];
            if (!vab) continue;
            for (const map of maps) {
                let filename = path.resolve(this.basicUrl, map.replace(/\*/g, vab));
                if (!filename.endsWith(".ts")) filename += ".ts";
                if (fs.existsSync(filename)) {
                    const info = fs.statSync(filename);
                    if (info.isFile()) {
                        this.aliasCache.set(path.resolve(importer, "..") + "\x00" + alias, filename);
                        return filename;
                    } else if (info.isDirectory()) {
                        //todo:解析目录
                    }
                }
                if (options.allowJs) {
                }
                if (options.resolveJsonModule) {
                }
            }
        }
        return null;
    }
}

export const DEFAULT_COMPILER_OPTIONS: CompilerOptions = (function () {
    const cwd = process.cwd();
    const compilerOptions: CompilerOptions = {};

    //解析环境变量中指定的tsconfig文件的编译选项
    const envPath = process.env["TS_CONFIG_PATH"];
    if (envPath) {
        const configPath = path.resolve(cwd, envPath);
        if (fs.existsSync(configPath)) {
            let options = paseConfigOptions(fs.readFileSync(configPath, "utf-8"), path.resolve(configPath, ".."));
            Object.assign(compilerOptions, options);
        }
    }

    //解析环境变量中的编译选项
    let fileContent = process.env["TS_COMPILER_OPTIONS"];
    if (fileContent) {
        let options = paseConfigOptions(fileContent, "/TS_COMPILER_OPTIONS");
        Object.assign(compilerOptions, options);
    }

    return compilerOptions;
})();
