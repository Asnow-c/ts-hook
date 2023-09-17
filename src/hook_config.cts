import type ts from "typescript";
import * as Path from "node:path";
import { ModuleKind, ScriptTarget, jsonToTsConfig, parseJson, readTsConfigFileSync } from "./util/tslib.js";
interface ProcessEnv {
    SAME_PARSER?: string;
    TS_COMPILER_OPTIONS?: string;
    TS_CONFIG_PATH?: string;
    COMPILER?: "swc" | "tsc";
    DISABLE_SOURCE_MAP?: string;
}
const env = process.env as ProcessEnv;
if (env.COMPILER !== "swc" && env.COMPILER !== "tsc") delete env.COMPILER;
export const hookConfig = {
    sameParsing: !!env["SAME_PARSER"],
    compiler: env.COMPILER,
    enableSourceMap: !env["DISABLE_SOURCE_MAP"],
};

export type HookConfig = typeof hookConfig;

/**
 * 配置优先级：addHook 的 topOptions 选项 > 环境变量中的 TS_COMPILER_OPTIONS > 环境变量 TS_CONFIG_PATH 指定的 tsconfig.json
 */

function getDefaultCompilerOptions() {
    const cwd = process.cwd();
    const compilerOptions: ts.CompilerOptions = {};

    //解析环境变量中指定的tsconfig文件的编译选项
    const envPath = process.env["TS_CONFIG_PATH"];
    if (envPath) {
        const options = readTsConfigFileSync(Path.resolve(cwd, envPath));
        Object.assign(compilerOptions, options);
    }

    //解析环境变量中的编译选项
    let fileContent = process.env["TS_COMPILER_OPTIONS"];
    if (fileContent) Object.assign(compilerOptions, jsonToTsConfig(parseJson(fileContent)));
    if (!compilerOptions.target) compilerOptions.target = ScriptTarget.ES2022 as any;
    return compilerOptions;
}
const DEFAULT_COMPILER_OPTIONS = getDefaultCompilerOptions();
const TOP_OPTIONS: ts.CompilerOptions = {
    removeComments: true,
    sourceMap: false,
    inlineSourceMap: hookConfig.enableSourceMap,
    noEmit: false,
    allowSyntheticDefaultImports: true,
    declaration: false,

    paths: undefined, //覆盖, swc会根据paths转换导入

    //module: [TsModuleKind.CommonJS, TsModuleKind.NodeNext, TsModuleKind.ESNext], 通过node进行确定

    // importHelpers:true,
    // noEmitHelpers
    // useDefineForClassFields
    // strict: false,
    // alwaysStrict: false,
    // noImplicitUseStrict: false,
    // esModuleInterop: false,
};

export function createCompilerOption(module: ModuleKind, modCompilerOption: ts.CompilerOptions): ts.CompilerOptions {
    const option = { ...DEFAULT_COMPILER_OPTIONS, ...modCompilerOption, ...TOP_OPTIONS };
    option.module = module;
    return option;
}
