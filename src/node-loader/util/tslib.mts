import ts from "typescript";

function convertCompilerOptionsFromJson(options: any, basicUrl: string) {
    return ts.convertCompilerOptionsFromJson(options, basicUrl);
}
export function parseJson(text: string): Record<string, any> {
    try {
        return JSON.parse(text) ?? {};
    } catch (error) {
        throw new Error("无法解析" + text + ": " + error);
    }
}
export function jsonToTsConfig(json: Record<string, any>, basicUrl: string) {
    if (!json.module) json.module = "ESNext";
    let { options: compilerOptions, errors } = convertCompilerOptionsFromJson(json, basicUrl);
    if (errors.length > 0) throw new Error(json + "配置不正确: " + errors.map((val) => val.messageText).join("\n\n"));
    return compilerOptions;
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
    ES3 = 0,
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
