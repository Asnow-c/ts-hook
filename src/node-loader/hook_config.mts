import type ts from "typescript";
import * as Fsp from "node:fs/promises";
import * as Path from "node:path";
import { ScriptTarget, jsonToTsConfig, parseJson } from "./util/tslib.mjs";
interface ProcessEnv {
    SAME_PARSER?: string;
    TS_COMPILER_OPTIONS?: string;
    TS_CONFIG_PATH?: string;
}
const env = process.env;
export const hookConfig = {
    sameParsing: !!env["SAME_PARSER"],
};

export type HookConfig = typeof hookConfig;

/**
 * 配置优先级：addHook 的 topOptions 选项 > 环境变量中的 TS_COMPILER_OPTIONS > 环境变量 TS_CONFIG_PATH 指定的 tsconfig.json
 */

async function getDefaultCompilerOptions() {
    const cwd = process.cwd();
    const jsonConfig: Record<string, any> = {};

    //解析环境变量中指定的tsconfig文件的编译选项
    const envPath = process.env["TS_CONFIG_PATH"];
    if (envPath) {
        const configPath = Path.resolve(cwd, envPath);
        let json = parseJson(await Fsp.readFile(configPath, "utf-8")).compilerOptions;
        Object.assign(jsonConfig, json);
    }

    //解析环境变量中的编译选项
    let fileContent = process.env["TS_COMPILER_OPTIONS"];
    if (fileContent) Object.assign(jsonConfig, parseJson(fileContent));

    return jsonToTsConfig(jsonConfig);
}
const DEFAULT_COMPILER_OPTIONS = await getDefaultCompilerOptions();
const TOP_OPTIONS = (function () {
    const NodeVersionMap: Record<string, ts.ScriptTarget> = {
        19: ScriptTarget.ES2022,
    };
    const version = process.version.slice(1, process.version.indexOf("."));
    const TARGET = DEFAULT_COMPILER_OPTIONS.target
        ? DEFAULT_COMPILER_OPTIONS.target
        : NodeVersionMap[version] ?? ScriptTarget.ESNext;

    const TOP_OPTIONS: ts.CompilerOptions = {
        removeComments: true,
        sourceMap: false,
        inlineSourceMap: true,
        noEmit: false,
        allowSyntheticDefaultImports: true,
        declaration: false,

        //涉及到运行结果
        experimentalDecorators: true,
        emitDecoratorMetadata: true,

        target: TARGET,
        //module: [TsModuleKind.CommonJS, TsModuleKind.NodeNext, TsModuleKind.ESNext], 通过node进行确定

        // importHelpers:true,
        // noEmitHelpers
        // useDefineForClassFields
        // strict: false,
        // alwaysStrict: false,
        // noImplicitUseStrict: false,
        // esModuleInterop: false,
    };
    return TOP_OPTIONS;
})();
export const DEFAULT_OPTIONS: ts.CompilerOptions = { ...TOP_OPTIONS, ...DEFAULT_COMPILER_OPTIONS };
