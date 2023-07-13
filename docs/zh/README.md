## ts_hook

该钩子主要用于在开发环境中直接运行 typescript , 省去了编译步骤

> 要求 node 版本>=16

全局安装: `npm install @asnc/ts_hook -g`\
项目安装: `npm install @asnc/ts_hook -D`

用法: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.ts`\
用法: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.mts`\
用法: `node --loader MODULE_PATH/@asnc/ts_hook/hook.mjs  xx.cts`\
用法: `node --loader @asnc/ts_hook/hook.mjs  xx.cts` （项目级使用）\

> 注意: `MODULE_PATH`是你安装`@asnc/ts_hook`的所在目录的绝对或相对路径, 使用绝对路径时, Windows 系统下必须以`/`开头
> 如 `/C:/npm_global/@asnc/ts_hook.mjs`, 使用相对路径时, 相对于 node 的启动目录, 且必须以`./`开头

> 如果使用全局安装`ts_hook`, 你需要全局安装 typescript 或 @swc/core 其中的一个依赖, 如果是项目安装`ts_hook`, 你需要在项目中安装 typescript 或 @swc/core, ts_hook 依赖他们, ts_hook 优先尝试导入 @swc/core, 如果导入失败, 才会尝试导入 typescript, 你可以在通过配置进行选择

### 与 ts-node 和 @swc-node/register 对比

|                               | @asnc/ts_hook          | @swc-node/register      | ts-node    |
| ----------------------------- | ---------------------- | ----------------------- | ---------- |
| 依赖                          | typescript 或@swc/core | typescript 和 @swc/core | typescript |
| 类型检查                      | 不支持                 | 不支持                  | 支持       |
| 源映射                        | 支持                   | 支持                    | 支持       |
| [跨包导入](#跨包导入) ts 项目 | 支持                   | 不支持                  | 不支持     |
| 混合 esm 和 commonjs          | 支持                   | 不支持                  | 支持       |
| [路径别名](#路径别名)         | 支持                   | 某些情况下支持          | 不支持     |

#### 跨包导入

在 monorepo 项目中，我们会同时用 Typescript 开发多个包，他们之间可能会互相引用
在这种场景下使用 Node debugger 某个包时，我们必须将这个包和它所依赖的 项目中的包进行编译
而
而如果使用 `ts-node` 或 `@swc-node/register` 则只需要编译它所依赖的包，这是因为他们的钩子不会对外部依赖进行编译
而这是非常不方便的
所以 `@asnc/ts_hook` 解决这个问题。@asnc/ts_hook 会跟踪所有 `.ts` `.mts` `.cts` 文件的导入

#### 混合 esm 和 commonjs

有如下目录：

```
work
- index.mts
- esm.mts
- cjs.tsc
```

index.mts:

```typescript
import "./cjs.cjs";
import "./esm.mjs";
console.log(__dirname);
```

`@swc-node/register` 直接无法解析这种全路径的导入

#### 路径别名

很多情况下 我们会在 tsconfig.json 设置 paths 字段
`@swc-node/register` 在运行时，只查找工作目录下的 tsconfig.json 文件的 paths 字段，如果在运行时工作目录不在项目中，这就意味着 `@swc-node/register` 无法读取别名配置，除非显示的设置别名

@asnc/ts_hooks 支持项目级的 tsconfig.json 中的别名配置（需要与 package.json 同目录）

### ts-hook 功能

-   不提供类型检查
-   可选 tsc 和 swc，编译器, 优先尝试导入 swc 编译器
-   支持 package.json 的 imports、 exports、main 字段
    -   如果通过这几个字段解析出的 文件 id 是以`.js` `.mjs` `.cjs` 扩展名结尾，并且这个文件不存在，则会长沙将扩展名替换成 `.ts` `.mts` `.cts` 后再尝试导入
-   ts 的 module 编译选项固定为 NodeNext
-   支持源映射
-   ES Module 可以使用与 commonjs 一致的解析策略

### 配置

配置需要从环境变量注入

对于 boolean 类型: 设置`""`为 `false` 其他值均为 `true`

##### SAME_PARSER: ES Module 是否使用与 Commonjs 相同的解析策略

类型 `boolean` 默认 `false`
开启后 ES Module 将使用与 Commonjs 相同的模块解析策略

##### TS_COMPILER_OPTIONS: 全局的 ts 文件编译配置

类型 `string`

注意: 有些配置是会被覆盖的

例子: vscode debugger 配置

```json
{
    "configurations": [
        {
            "type": "node",
            "env": {    //注入环境变量
                "TS_COMPILER_OPTIONS": "{\"target\":\"esnext\"}",
            },
            ...
        }
    ]
}
```

##### TS_CONFIG_PATH: 全局 ts 文件编译的配置文件

类型 `string`

注意: 有些配置是会被覆盖的

#### 配置案例

vscode 调试配置, 可以注入环境变量

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "ts debugger",
            "runtimeArgs": ["--loader", "./node_modules/@asnc/ts_hook/hook.mjs"], //使用loader
            //注入环境变量
            "env": {
                "SAME_PARSER": "" //设置"" 即false
            },
            "sourceMaps": true,
            "program": "${file}"
        }
    ]
}
```
