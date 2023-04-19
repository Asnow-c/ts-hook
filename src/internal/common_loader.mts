import Module from "node:module";
import { upSearch } from "../util/file_tool.mjs";
import * as fsp from "node:fs/promises";
import * as fs from "node:fs";
import type * as ts from "typescript";
import * as Path from "node:path";
export const ExtraModule = Module as ExtraModule;

export class Pkg implements PackageConfig {
    static upSearchPkg(startPath: string, suffix: string = "") {
        for (const path of upSearch(startPath)) {
            let absPath = path + suffix;
            let pkg = this.getPkg(absPath);
            if (pkg) return pkg;
        }
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
    name?: string;
    main?: string;
    exports?: Record<string, any>;
    imports?: Record<string, any>;
    type?: "commonjs" | "module" | undefined;

    get defaultFormat(): PkgFormat {
        return this.type === "module" ? "module" : "commonjs";
    }

    tryTsAliasSync(importerPathname: string, request: string) {
        const tsConfig = TsCompilerConfig.getTsCompilerConfigSync(this.pkgPath, this.pkgConfig);
        if (!tsConfig) return;
        return tsConfig.paseAlias(importerPathname, request);
    }
    async tryTsAlias(importerPathname: string, request: string) {
        const tsConfig = await TsCompilerConfig.getTsCompilerConfig(this.pkgPath, this.pkgConfig);
        if (!tsConfig) return;
        return tsConfig.paseAlias(importerPathname, request);
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
    private constructor(
        private readonly pkgPath: string,
        private readonly pkgConfig: PackageConfig,
        private readonly options: ts.CompilerOptions
    ) {
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
        return this.aliasCache.get(Path.resolve(importer, "..") + "\x00" + alias);
    }
    paseAliasSync(importer: string, alias: string) {
        for (const [regExp, maps] of this.alias) {
            const vab = alias.match(regExp)?.[1];
            if (!vab) continue;
            for (const map of maps) {
                let filename = Path.resolve(this.pkgPath, map.replace(/\*/g, vab));
                if (!filename.endsWith(".ts")) filename += ".ts";

                const info = fs.statSync(filename);
                if (info.isFile()) {
                    this.aliasCache.set(Path.resolve(importer, "..") + "\x00" + alias, filename);
                    return filename;
                } else if (info.isDirectory()) {
                    //todo:解析目录
                }
            }
        }
        return null;
    }
    async paseAlias(importer: string, alias: string) {
        for (const [regExp, maps] of this.alias) {
            const vab = alias.match(regExp)?.[1];
            if (!vab) continue;
            for (const map of maps) {
                let filename = Path.resolve(this.pkgPath, map.replace(/\*/g, vab));
                if (!filename.endsWith(".ts")) filename += ".ts";

                const info = await fsp.stat(filename);
                if (info.isFile()) {
                    this.aliasCache.set(Path.resolve(importer, "..") + "\x00" + alias, filename);
                    return filename;
                } else if (info.isDirectory()) {
                    //todo:解析目录
                }
            }
        }
        return null;
    }
}
