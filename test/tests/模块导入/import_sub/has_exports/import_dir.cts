async function ss() {
    return import("has_exports_ts/dir");
}

ss().catch((e) => {
    process.send?.(e.code);
});
