import {} from "typescript";
import ts from "typescript";

function convertCompilerOptionsFromJson(options: any, basicUrl: string) {
    return ts.convertCompilerOptionsFromJson(options, basicUrl);
}

export function paseConfigOptions(textOptions: string, basicUrl: string) {
    let options;
    try {
        options = JSON.parse(textOptions).compilerOptions ?? {};
    } catch (error) {
        throw new Error("无法解析" + textOptions + ": " + error);
    }
    if (!options.module) options.module = "ESNext";
    let { options: compilerOptions, errors } = convertCompilerOptionsFromJson(options, basicUrl);
    if (errors.length > 0)
        throw new Error(textOptions + "配置不正确: " + errors.map((val) => val.messageText).join("\n\n"));
    return compilerOptions;
}
export function isTsPath(url: string) {
    return /\.[mc]?ts$/.test(url);
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
