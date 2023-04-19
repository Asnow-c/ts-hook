declare module "source-map-support" {}

type ModuleClass = typeof import("node:module");
interface ExtraModule extends ModuleClass {
    _readPackage(absPath: string): PackageConfig | undefined;
    _findPath(request: string, paths: string[], isMain: boolean): undefined | string;
    _resolveLookupPaths(request: string, parent: import("node:module")): string[];
    _resolveFilename(
        request: string,
        parent: import("node:module") | undefined,
        isMain: boolean,
        options?: any
    ): string | undefined;
    _pathCache: Record<string, string>;
    _cache: Record<string, ExtraModule>;
}

interface ResolveContext {
    conditions: string[];
    importAssertions: any;
    parentURL?: string;
}

interface PackageConfig {
    name?: string;
    main?: string;
    type?: "module" | "commonjs";
    exports?: Record<string, any>;
    imports?: Record<string, any>;
}
type PkgExportsItemValue = string | null | string[];
type PkgExports = Record<
    "imports" | "require" | "node" | "default" | "types" | "." | string,
    Record<string, PkgExportsItemValue> | PkgExportsItemValue
>;

type PkgFormat = "builtin" | "commonjs" | "json" | "module" | "wasm";
interface ResolveFxReturn {
    format?: PkgFormat;
    importAssertions?: any;
    shortCircuit?: boolean;
    url: string;
}

interface LoadContext {
    conditions: string[];
    format?: PkgFormat;
    importAssertions: any;
}
interface LoadReturn {
    format: PkgFormat;
    shortCircuit?: boolean;
    source?: string | ArrayBuffer;
}
type NextResolveFx = (specifier: string, context: ResolveContext) => Promise<ResolveFxReturn>;
type NextLoadFx = (specifier: string, context: LoadContext) => Promise<LoadReturn>;
