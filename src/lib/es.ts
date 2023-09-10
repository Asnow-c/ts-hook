export function getESVersion(): number {
    let version: number;
    if (!Array.prototype.at) {
        version = 21;
    } else if (!Array.prototype.toSorted) {
        version = 22;
    } else {
        version = 23;
    }
    return version;
}
declare let Array: any;
