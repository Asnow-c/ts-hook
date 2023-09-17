async function imports() {
    await import("./exports/mod_ts.js");
    await import("./exports/mod_cts.cts");
    await import("./exports/mod_cts.cjs");
    await import("./exports/mod_esm.mts");
    await import("./exports/mod_esm.mjs");

    console.log(import.meta as any);

    process.send?.("entry");
}
imports();
