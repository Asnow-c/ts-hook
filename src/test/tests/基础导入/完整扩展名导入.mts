import "./exports/mod_ts.js";
import "./exports/mod_cts.cjs";
import "./exports/mod_esm.mjs";
console.log(import.meta.url as any);

process.send?.("entry");
