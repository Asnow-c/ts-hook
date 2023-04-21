import ts from "typescript";
import * as sourceMapSupport from "source-map-support";
export const SourcemapMap = new Map();
(sourceMapSupport as any).install({
    // handleUncaughtExceptions: false,
    environment: "node",
    hookRequire: true,
    retrieveSourceMap(filename: string) {
        if (SourcemapMap.has(filename)) {
            return {
                url: filename,
                map: SourcemapMap.get(filename),
            };
        }
        return null;
    },
});
function tryCompiler() {
    return import("../../complier/swc-complier.mjs").then(
        function ({ transform, transformSync }) {
            return {
                compiler: function swcCompiler(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
                    //todo
                    return transformSync(code, fileAbsPath, compilerOptions as any).code;
                },
                type: "swc",
            };
        },
        function () {
            return {
                compiler: function tsCompiler(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
                    const { outputText, sourceMapText } = ts.transpileModule(code, {
                        fileName: fileAbsPath,
                        compilerOptions,
                    });

                    return outputText;
                },
                type: "ts",
            };
        }
    );
}
// const { compiler, type } = await tryCompiler();
// export { compiler, type };

export function compileTsCode(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = ts.transpileModule(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}
