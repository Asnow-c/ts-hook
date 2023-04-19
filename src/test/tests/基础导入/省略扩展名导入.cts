import "./exports/mod_ts";
console.log(__dirname as any);

process.send!("entry");
