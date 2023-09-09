import type ts from "typescript";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as Path from "node:path";

export function parseJson(text: string, safe?: boolean): Record<string, any> {
    try {
        return JSON.parse(text) ?? {};
    } catch (error) {
        if (safe) return {};
        throw new Error("无法解析" + text + ": " + error);
    }
}

export function readTsConfigFile(configAbsPath: string, safe?: boolean): Promise<ts.CompilerOptions>;
export async function readTsConfigFile(configAbsPath?: string, safe?: boolean): Promise<ts.CompilerOptions> {
    let compilerOptions: RawTsCompilerOptions = {};

    try {
        while (configAbsPath) {
            const config: TsConfig = parseJson(await fsp.readFile(configAbsPath, "utf-8"));
            if (typeof config.compilerOptions === "object" && config.compilerOptions) {
                Object.assign(config.compilerOptions, compilerOptions);
                compilerOptions = config.compilerOptions;
            }

            configAbsPath =
                typeof config.extends === "string" ? Path.resolve(configAbsPath, "..", config.extends) : undefined;
        }
    } catch (error) {
        if (safe) return compilerOptions;
        throw error;
    }
    return jsonToTsConfig(compilerOptions, safe);
}

export function readTsConfigFileSync(configAbsPath: string, safe?: boolean): ts.CompilerOptions;
export function readTsConfigFileSync(configAbsPath?: string, safe?: boolean): ts.CompilerOptions {
    let compilerOptions: RawTsCompilerOptions = {};

    try {
        while (configAbsPath) {
            const config: TsConfig = parseJson(fs.readFileSync(configAbsPath, "utf-8"));
            if (typeof config.compilerOptions === "object" && config.compilerOptions) {
                Object.assign(config.compilerOptions, compilerOptions);
                compilerOptions = config.compilerOptions;
            }

            configAbsPath =
                typeof config.extends === "string" ? Path.resolve(configAbsPath, "..", config.extends) : undefined;
        }
    } catch (error) {
        if (safe) return compilerOptions;
        throw error;
    }
    return jsonToTsConfig(compilerOptions, safe);
}
/** 将json转为编译选项, 并移除无关配置 */
export function jsonToTsConfig(json: RawTsCompilerOptions, safe?: boolean) {
    function findEnum<T = unknown>(enumObj: object, felid: string): T | undefined {
        felid = felid.toUpperCase();
        for (const [key, val] of Object.entries(enumObj)) {
            if (key.toUpperCase() === felid) return val as any;
        }
    }
    let tsConfig: ts.CompilerOptions = { ...json };
    if (json.target) {
        let targetKey: any = (json.target as string).toUpperCase();
        if (targetKey === "ESNEXT") tsConfig.target = ScriptTarget.ESNext;
        else if (targetKey.startsWith("ES")) tsConfig.target = ScriptTarget[targetKey] as any as ScriptTarget;
        else if (targetKey === "LATEST") tsConfig.target = ScriptTarget.Latest;
        else if (targetKey === "JSON") tsConfig.target = ScriptTarget.JSON;
        else if (!safe) throw new FelidError("target");
    }
    if (json.moduleResolution) {
        tsConfig.moduleResolution = findEnum<ModuleResolutionKind>(ModuleResolutionKind, json.moduleResolution);
        if (tsConfig.moduleResolution === undefined && !safe) throw new FelidError("moduleResolution");
    }
    return tsConfig;
}

export function isTsPath(url: string) {
    if (url.endsWith(".ts") || url.endsWith(".cts") || url.endsWith(".mts")) return true;
    return false;
}
enum ModuleKind {
    None = 0,
    CommonJS = 1,
    AMD = 2,
    UMD = 3,
    System = 4,
    ES2015 = 5,
    ES2020 = 6,
    ES2022 = 7,
    ESNext = 99,
    Node16 = 100,
    NodeNext = 199,
}
enum ScriptTarget {
    ES5 = 1,
    ES2015 = 2,
    ES2016 = 3,
    ES2017 = 4,
    ES2018 = 5,
    ES2019 = 6,
    ES2020 = 7,
    ES2021 = 8,
    ES2022 = 9,
    ESNext = 99,
    JSON = 100,
    Latest = 99,
}

/** @deprecated */
enum ImportsNotUsedAsValues {
    Remove = 0,
    Preserve = 1,
    Error = 2,
}
enum ModuleResolutionKind {
    Classic = 1,
    /**
     * @deprecated
     * `NodeJs` was renamed to `Node10` to better reflect the version of Node that it targets.
     * Use the new name or consider switching to a modern module resolution target.
     */
    NodeJs = 2,
    Node10 = 2,
    Node16 = 3,
    NodeNext = 99,
    Bundler = 100,
}
class FelidError extends Error {
    constructor(felid: string) {
        super(`The value of Field ${felid} is incorrect`);
    }
}
export type RawTsCompilerOptions = {
    [key in keyof ts.CompilerOptions]: ts.CompilerOptions[key] extends string | boolean | undefined | null
        ? ts.CompilerOptions[key]
        : any;
};
export type TsConfig = { extends?: string; compilerOptions?: RawTsCompilerOptions };
export { ScriptTarget, ModuleKind, ModuleResolutionKind };
