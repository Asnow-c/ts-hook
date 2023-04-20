/// <reference path="../src/ts_hook/global.d.ts"/>

import { pathToFileURL } from "url";

/** 确认文件存在, 如果文件是符号链接则转换返回 */
declare function tryFile(path: string, isMain: string): string | undefined;

/** 将name根据imports内容 进行解析*/
declare function packageImportsResolve(name: string, base: URL, conditions: Set<string>): string;

/** 未知 */
declare function packageExportsResolve(name: string, base: URL, conditions: Set<string>): string;

declare function finalizeEsmResolution(resolved: string, parentPath: string, pgkPath: string): string | never;

/**
 * @description 从某个路径开始向上查找package.json并获取其内容
 * @returns data:package.json运行时内容  path:package.json对于的包的路径
 */
export declare function readPackageScope(absPath: string): { data: PkgJsonInfo; path: string };
//!同步
export declare function toRealPath(requestPath: string): string;
/** 检查是否导入自身模块 */

declare function trySelf(parentPath: string, request: string): false | string;

class Module {
    /**
     * !同步
     * @description 获取package.json的内容(带有缓存功能)
     * @param packageAbsPath 模块的绝对路径 require(requestPath)   import requestPath
     */
    static _readPackage(packageAbsPath: string): PkgJsonInfo {
        return "" as any;
    }

    /**
     * 获取需要查找的路径列表
     */
    static _resolveLookupPaths(request: string, parent: Module): string[] {}
    /**
     * @param request js文件中导入的字符; require("./ss") => request="./ss"
     * @param parent 父模块实例
     * @param isMain 是否是入口文件
     * @param options 未知
     */
    static _resolveFilename(request: string, parent: Module, isMain: boolean, options?: Object): string | undefined {
        //request是否是内部模块,是则返回
        // request==="fs" return "fs"
        // request==="node:fs" return "fs"
        if (request === "是内部模块") return request;

        let paths: string[];
        if (options) {
            //未知
        } else paths = this._resolveLookupPaths(request, parent);

        //判断导入的是否是别名(package.json中的imports字段声明)
        if (request[0] === "#" && (parent?.filename || parent?.id === "<repl>")) {
            const parentPath = parent.filename;
            const pkg = readPackageScope(parentPath); //从父模块的路径开始查找

            //将路径别名转换为绝对路径
            return finalizeEsmResolution(
                packageImportsResolve(request, pathToFileURL(parentPath), "" as any),
                parentPath,
                pkg.path
            );
        }
        //const selfResolved trySelf(parentPat); 导入自身
        //if(selfResolved) return selfResolved

        const fileName = this._findPath(request, paths!, isMain);
        if (fileName) return fileName;
    }
    static _findPath(request: string, paths: string[], isMain: boolean): string | false {
        //判断是否是绝对路径 是则将paths=[""]
        //查找路径缓存
        for (let i = 0; i < paths.length; i++) {
            //目录
            //链接
        }
        return false;
    }

    /** 入口 */
    static _load(request: string, parent: Module, isMain: boolean) {
        //根据request和parent查找缓存
        if (parent) {
            //查找filename缓存
            let fileName; // =relativeResolveCache[relResolveCacheIdentifier];
            if (fileName) return this._cache[fileName];
        }
        if (request.startsWith("node:")) {
            //处理node:前缀
            return;
        }
        const fileName = this._resolveFilename(request, parent, isMain);
        const cachedModule = this._cache[fileName];
        if (cachedModule) {
            return;
        }
        //加载内部模块
        //const mod=loadBuiltinModule()
        //if(mod)return mod

        const module = new Module();
        this._cache[fileName] = module; //缓存

        module.load(fileName); //加载

        return module.exports;
    }
    static _cache: Record<string, Module>;
    id: string;
    filename: string;
    load(filename: string) {}
    require(request: string) {
        Module._load(request, this, false);
    }
    exports: any;
}
