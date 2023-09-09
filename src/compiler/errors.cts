import * as Path from "node:path";

const home = require.main?.path ?? Path.resolve(__dirname, "../../..");
export class CompileImportError extends Error {
    constructor(complier: string) {
        super(`Cannot import ${complier} from ${home}`);
    }
}
export class NoCompileError extends Error {
    constructor() {
        super(
            "loader depends on typescript or @swc/core, you must install at least one compiler: npm install typescript or npm install @swc/core"
        );
    }
}
console.log(home);
