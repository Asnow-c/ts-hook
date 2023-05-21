import Module from "node:module";
import { upSearch } from "../util/file_tool";
import * as fsp from "node:fs/promises";
import * as fs from "node:fs";
import type * as ts from "typescript";
import * as Path from "node:path";

export class Pkg implements PackageConfig {
    private static pkgSearchCache = new Map<string, string | null>();

    static upSearchPkg(startPath: string, suffix: string = "") {
        let pkgPath = this.pkgSearchCache.get(startPath);
        if (pkgPath) return this.getPkg(pkgPath);
        else if (pkgPath === null) return;

        for (const path of upSearch(startPath)) {
            let absPath = path + suffix;
            let pkg = this.getPkg(absPath);
            if (pkg) {
                this.pkgSearchCache.set(startPath, absPath);
                return pkg;
            }
        }
        this.pkgSearchCache.set(startPath, null);
    }
    static getPkg(absPkgPath: string) {
        let pkgConfig = ExtraModule._readPackage(absPkgPath);
        if (pkgConfig) return new this(pkgConfig, absPkgPath);
        else undefined;
    }
    private constructor(private pkgConfig: PackageConfig, readonly pkgPath: string) {
        if (typeof pkgConfig.exports === "string") pkgConfig.exports = { ".": pkgConfig.exports };
        this.type = pkgConfig.type;
        this.name = pkgConfig.name;
        this.main = pkgConfig.main;
        this.imports = pkgConfig.imports;
        this.exports = pkgConfig.exports;
    }
    getFileFormat(filename: string): NodeLoader.Format {
        const { ext } = Path.parse(filename);
        if (ext === ".cts" || ".cjs") return "commonjs";
        else if (ext === ".mts" || ".mjs") return "module";
        else if (ext === ".ts" || ext == "js") return this.defaultFormat;
        else return "commonjs";
    }
    name?: string;
    main?: string;
    exports?: Record<string, any>;
    imports?: Record<string, any>;
    type?: "commonjs" | "module" | undefined;

    get defaultFormat(): NodeLoader.Format {
        return this.type === "module" ? "module" : "commonjs";
    }
    getTsConfigSync() {
        return TsCompilerConfig.getTsCompilerConfigSync(this.pkgPath, this.pkgConfig);
    }
    getTsConfig() {
        return TsCompilerConfig.getTsCompilerConfig(this.pkgPath, this.pkgConfig);
    }
}

export class TsCompilerConfig {
    static readonly configCache = new Map<string, TsCompilerConfig | null>();
    static findCache(path: string) {
        return this.configCache.get(path);
    }

    static getTsCompilerConfigSync(pkgPath: string, pkgConfig: PackageConfig) {
        let instance = this.findCache(pkgPath);
        if (instance !== undefined) return instance;
        let compilerOptions;
        try {
            const tsconfig = fs.readFileSync(pkgPath + "/tsconfig.json", "utf-8");
            compilerOptions = JSON.parse(tsconfig)?.compilerOptions;
        } catch (error) {
            this.configCache.set(pkgPath, null);
            return null;
        }
        instance = new this(pkgPath, pkgConfig, compilerOptions);
        this.configCache.set(pkgPath, instance);
        return instance;
    }
    static async getTsCompilerConfig(pkgPath: string, pkgConfig: PackageConfig) {
        let instance = this.findCache(pkgPath);
        if (instance !== undefined) return instance;
        let compilerOptions;
        try {
            const tsconfig = await fsp.readFile(pkgPath + "/tsconfig.json", "utf-8");
            compilerOptions = JSON.parse(tsconfig)?.compilerOptions;
        } catch (error) {
            this.configCache.set(pkgPath, null);
            return null;
        }
        instance = new this(pkgPath, pkgConfig, compilerOptions);
        this.configCache.set(pkgPath, instance);
        return instance;
    }
    private alias = new Map<RegExp, string[]>();
    constructor(private readonly pkgPath: string, pkgConfig: PackageConfig, options: ts.CompilerOptions) {
        const baseUrl = options.baseUrl ? Path.resolve(pkgPath, options.baseUrl) : pkgPath;
        const tsPaths = options.paths;
        if (!tsPaths) return;
        const alias = this.alias;
        for (const [key, values] of Object.entries(tsPaths)) {
            if (!values?.length) continue;
            for (let i = 0; i < values.length; i++) {
                let item = values[i];
                values[i] = Path.resolve(baseUrl, item);
            }
            const split = "^" + key.replace(/\*/, "(.+)") + "$";
            alias.set(new RegExp(split), values);
        }
    }
    private aliasCache = new Map<string, string>();

    findAliasCache(request: string) {
        return this.aliasCache.get(request);
    }
    setAliasCache(request: string, filename: string) {
        return this.aliasCache.set(request, filename);
    }
    *paseAlias(alias: string) {
        for (const [regExp, maps] of this.alias) {
            let res = alias.match(regExp);
            if (!res) continue;
            for (const map of maps) {
                if (map.includes("*")) {
                    let vab = res[1];
                    if (!vab) continue;
                    yield Path.resolve(this.pkgPath, map.replace(/\*/g, vab));
                } else {
                    return maps;
                }
            }
        }
    }
}

export type ModResolveError = Error & { code: string; path?: string; requireStack?: string[] };

export function requestToNameAndSubPath(request: string) {
    const res = /^((?:@[^/\\%]+\/)?[^./\\%][^/\\%]*)(\/.*)?$/.exec(request);
    if (res) {
        return {
            pkgName: res[1],
            subPath: res[2] ?? "",
        };
    }
}

type ModuleClass = typeof import("node:module");
export interface ExtraModule extends ModuleClass {
    _readPackage(absPath: string): PackageConfig | undefined;
    _findPath(request: string, paths: string[], isMain: boolean): undefined | string;
    _resolveLookupPaths(request: string, parent: import("node:module")): string[];
    _resolveFilename(
        request: string,
        parent: import("node:module") | undefined,
        isMain: boolean,
        options?: any
    ): string | undefined;
    _pathCache: Record<string, string>;
    _cache: Record<string, ExtraModule>;
}
type PkgExportsItemValue = string | null | string[];
type PkgExports = Record<
    "imports" | "require" | "node" | "default" | "types" | "." | string,
    Record<string, PkgExportsItemValue> | PkgExportsItemValue
>;
interface PackageConfig {
    name?: string;
    main?: string;
    type?: "module" | "commonjs";
    exports?: Record<string, any>;
    imports?: Record<string, any>;
}

export const ExtraModule = Module as ExtraModule;
