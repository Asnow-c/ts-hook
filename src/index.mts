import Module from "node:module";
import { fileURLToPath } from "url";
import * as Path from "path";
import { isTsPath as isTsUrl } from "./util/tslib.mjs";
import {
    ExtraModule,
    resolvePackage,
    tryFile,
    tryWithoutExt,
    tryWithoutExtSync,
    findAndReadPackageJson,
} from "./internal/esm_loader.mjs";
import { CodeError } from "./internal/errors/error.mjs";

export async function resolve(
    specifier: string,
    context: ResolveContext,
    nextResolve: NextResolveFx
): Promise<ResolveFxReturn> {
    const { parentURL } = context;

    if (!parentURL) {
        //入口文件
        const url = specifier;
        let format = await getTsModule(fileURLToPath(url)); //format为undefined时说明入口文件不是ts文件
        if (format) {
            return {
                format,
                url,
                shortCircuit: true,
            };
        }
    } else if (isTsUrl(parentURL) && !Module.isBuiltin(specifier)) {
        const parentDir = Path.resolve(fileURLToPath(parentURL), "..");
        let absRequest = toAbsPath(specifier, parentDir);
        if (absRequest) {
            let result = await tryWithoutExt(absRequest);
            if (result) return result;

            let filename = await tryFile(absRequest);
            if (!filename) return nextResolve(specifier, context);

            let format: PkgFormat =
                ExtraModule._readPackage(fileURLToPath(filename))?.type === "module" ? "module" : "commonjs";
            return {
                url: filename,
                format,
                shortCircuit: true,
            };
        } else {
            if (specifier.startsWith("#")) return nextResolve(specifier, context);
            //处理包
            let data = await resolvePackage(specifier, parentDir);
            if (!data) return nextResolve(specifier, context);

            return {
                ...data,
                shortCircuit: true,
            };
        }
    }
    let data = await nextResolve(specifier, context);
    return data;
}

const rawResolveFilename = ExtraModule._resolveFilename;
ExtraModule._resolveFilename = function _resolveFilename(
    this: ExtraModule,
    request: string,
    parent: Module,
    isMain: boolean
): string | undefined {
    if (parent && isTsUrl(parent.filename)) {
        let absRequest = toAbsPath(request, parent.path);
        if (absRequest) {
            let filename = tryWithoutExtSync(absRequest);
            if (filename) return filename;
        } else {
            try {
                return rawResolveFilename.apply(this, arguments as any);
            } catch (error) {
                if ((error as CodeError).code !== "MODULE_NOT_FOUND") throw error;
                //todo
                throw error;
            }
        }
    }
    return rawResolveFilename.apply(this, arguments as any);
};

/**
 * @returns undefined: 请求不是路径  string: 绝对路径
 */
function toAbsPath(request: string, parentPath: string) {
    let isRel = request === "." || request === ".." || /^\.\.?[\\\/]/.test(request);
    if (isRel) return Path.resolve(parentPath, request);
    if (Path.isAbsolute(request)) return request;
}

async function getTsModule(filename: string): Promise<PkgFormat | undefined> {
    let ext = filename.match(/\.[cm]?ts$/)?.[0];
    if (ext) {
        if (ext === ".mts") return "module";
        else if (ext === ".cts") return "commonjs";
        else {
            let fileDir = Path.resolve(filename, "..");
            let result = await findAndReadPackageJson(fileDir);
            if (result) return result.data.type === "module" ? "module" : "commonjs";
            else return "commonjs";
        }
    }
}
