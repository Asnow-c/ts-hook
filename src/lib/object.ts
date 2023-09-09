export function pickObjectAttr<T extends object, Keys extends keyof T>(obj: T, keys: Keys[]): Pick<T, Keys> {
    let newObj: Record<any, any> = {};
    for (let i = 0; i < keys.length; i++) {
        newObj[keys[i]] = obj[keys[i]];
    }
    return newObj as any;
}
