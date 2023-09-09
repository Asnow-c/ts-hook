export * from "./out/ts.resolver.mjs";
export * from "./out/ts_transpile.load.mjs" //编译ts

//node v20 兼容
export function globalPreload(context) {
    return `
    const { createRequire } = getBuiltin('module');
    const { cwd } = getBuiltin('process');
    const require = createRequire("${import.meta.url}")
    require("./require.cjs")`;
} 