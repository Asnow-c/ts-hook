type PkgExportsValue = string | null;

export type ClassifyExports = {
    imports?: PkgExportsValue;
    require?: PkgExportsValue;
    types?: PkgExportsValue;
    node?: PkgExportsValue;
};
export type PkgExports = Record<"." | string, PkgExportsValue | ClassifyExports>;
export interface PackageConfig {
    name?: string;
    main?: string;
    type?: "module" | "commonjs";
    exports?: PkgExports;
    imports?: Record<string, string>;
    /** node 20 新增 */
    exists?: boolean;
}
