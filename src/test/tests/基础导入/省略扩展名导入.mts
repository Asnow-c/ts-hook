import "./exports/mod_ts";
console.log(import.meta.url as any);

process.send!("entry");
