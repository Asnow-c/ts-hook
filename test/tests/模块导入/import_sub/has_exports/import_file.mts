(async function ss() {
    return import("has_exports_ts/dir/index");
})().catch((e) => {
    process.send?.(e.code);
});
