import type ts from "typescript";
import * as fs from "node:fs";

export function parseJson(text: string): Record<string, any> {
    try {
        return JSON.parse(text) ?? {};
    } catch (error) {
        throw new Error("无法解析" + text + ": " + error);
    }
}
export async function readTsConfigFile(configPath: string) {
    let json = parseJson(await fs.promises.readFile(configPath, "utf-8")).compilerOptions;
    return jsonToTsConfig(json);
}
export function readTsConfigFileSync(configPath: string) {
    let json = parseJson(fs.readFileSync(configPath, "utf-8")).compilerOptions;
    return jsonToTsConfig(json);
}
/** 将json转为编译选项, 并移除无关配置 */
export function jsonToTsConfig<T extends { [key in keyof ts.CompilerOptions]: any }>(json: T) {
    let tsConfig: ts.CompilerOptions = {};
    mergeObject(json, tsConfig, [
        "importHelpers",
        "noEmitHelpers",
        "emitDecoratorMetadata",
        "strict",
        "alwaysStrict",
        "noImplicitUseStrict",
        "esModuleInterop",
        "basicUrl",
        "paths",
    ]);
    if (json.target) {
        let targetKey: any = (json.target as string).toUpperCase();
        if (targetKey === "ESNEXT") tsConfig.target = ScriptTarget.ESNext;
        else if (targetKey.startsWith("ES")) tsConfig.target = ScriptTarget[targetKey] as any as ScriptTarget;
        else if (targetKey === "LATEST") tsConfig.target = ScriptTarget.Latest;
        else if (targetKey === "JSON") tsConfig.target = ScriptTarget.JSON;
        else throw new Error("字段 target 不正确");
    }
    return tsConfig;
}

function mergeObject(from: Object, to: Object, keys: string[]): void;
function mergeObject(from: any, to: any, keys: string[]) {
    for (const key of keys) {
        let val = from[key];
        if (val !== undefined) to[key] = val;
    }
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

export { ScriptTarget, ModuleKind };
