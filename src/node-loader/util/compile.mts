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

export function compileTsCode(code: string, fileAbsPath: string, compilerOptions: ts.CompilerOptions) {
    const { outputText, sourceMapText } = ts.transpileModule(code, {
        fileName: fileAbsPath,
        compilerOptions,
    });

    return outputText;
}
