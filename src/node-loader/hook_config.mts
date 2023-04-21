import type ts from "typescript";
import * as Fsp from "node:fs/promises";
import * as Path from "node:path";
import { ScriptTarget, paseConfigOptions } from "./util/tslib.mjs";

const env = process.env;
export const hookConfig = {
    enableTsAlias: !!env["ENABLE_TS_ALIAS"],
    sameParsing: !!env["SAME_PARSER"],
};

export type HookConfig = typeof hookConfig;
export interface ProcessEnv {
    ENABLE_TS_ALIAS?: string;
    SAME_PARSER?: string;
    TS_COMPILER_OPTIONS?: string;
    TS_CONFIG_PATH?: string;
}
/**
 * 配置优先级：addHook 的 topOptions 选项 > 环境变量中的 TS_COMPILER_OPTIONS > 环境变量 TS_CONFIG_PATH 指定的 tsconfig.json > 进程的 pwd 向上搜索到的 tsconfig.json
 * 配置的 module 选项：cts 强制为 commonJs，ets 强制为 ESNext, 如果package.json 中的 type 为 module，则 ts 强制为 ESNext
 */

async function getDefaultCompilerOptions() {
    const cwd = process.cwd();
    const compilerOptions: ts.CompilerOptions = {};

    //解析环境变量中指定的tsconfig文件的编译选项
    const envPath = process.env["TS_CONFIG_PATH"];
    if (envPath) {
        const configPath = Path.resolve(cwd, envPath);

        let options = paseConfigOptions(await Fsp.readFile(configPath, "utf-8"), Path.resolve(configPath, ".."));
        Object.assign(compilerOptions, options);
    }

    //解析环境变量中的编译选项
    let fileContent = process.env["TS_COMPILER_OPTIONS"];
    if (fileContent) {
        let options = paseConfigOptions(fileContent, "/TS_COMPILER_OPTIONS");
        Object.assign(compilerOptions, options);
    }

    return compilerOptions;
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
        // allowJs: true,
        // resolveJsonModule: true,
        allowSyntheticDefaultImports: true,
        declaration: false,

        //涉及到运行结果
        experimentalDecorators: true,
        // strict: true,
        target: TARGET,
        //module: [TsModuleKind.CommonJS, TsModuleKind.NodeNext, TsModuleKind.ESNext], 通过node版本进行确定
        //target: ts.ScriptTarget.ESNext, 通过node版本进行确定

        // importHelpers:true,
        // noEmitHelpers
    };
    return TOP_OPTIONS;
})();
export const DEFAULT_OPTIONS: ts.CompilerOptions = { ...DEFAULT_COMPILER_OPTIONS, ...TOP_OPTIONS };
