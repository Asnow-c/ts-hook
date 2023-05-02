# ts-hook

该钩子主要用于在开发环境中直接运行 typescript , 省去了编译步骤

> 要求 node 版本>=16

全局安装: `npm install @asnc/ts_hook -g`\
项目安装: `npm install @asnc/ts_hook -D`

用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.ts`\
用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.mts`\
用法: `node --loader GLOBAL_PATH/@asnc/ts_hook/hook.mjs  xx.cts`

> 注意: `GLOBAL_PATH`是你安装`@asnc/ts_hook`的所在目录的绝对或相对路径, 使用绝对路径时, Windows 系统下必须以`/`开头
> 如 `/C:/npm_global/@asnc/ts_hook.mjs`, 使用相对路径时, 相对于 node 的启动目录, 且必须以`./`开头

### 使用 ts-hook 的几种场景

-   快捷运行一些 ts 文件(当然, 其他工具更加完善如 ts-node、swc-node)
-   对于 ES Module 项目的 ts 文件的 debugger

    对于 mts 文件或者 package.json 设置了 type="module"的项目, 往往 ts 文件的导入语法都是 import "./mod.js" 或者 import "./mod.mjs", 对于 ts-node 好像无法处理这种情况

-   直接运行导入了 ts 库的 ts 文件

    假如有一个使用 typescript 编写的库函数, 名字为 pkgLib, 当项目导入了这个 pkgLib 时, 如果此时想调试这个项目, pkgLib 必须经过编译, 否则无法运行

-   tsconfig paths 路径别名处理
    需要开启 `ENABLE_TS_ALIAS`, 开启后可以处理路径别名的导入

### ts-hook 功能

-   不提供类型检查
-   支持 package.json 的 imports、 exports、main 字段
-   不依赖 tsconfig.json
-   根据 package.json 中的 type 和文件扩展名自动确定 ts 编译选项的 module
-   根据 node 版本自动确定 target
-   支持源映射
-   ES Module 可以使用了与 commonjs 一致的解析策略

### 配置

配置需要从环境变量注入

对于 boolean 类型: 设置`""`为 `false` 其他值均为 `true`

##### ENABLE_TS_ALIAS: 是否开启 ts 路径别名的支持

类型 `boolean` 默认 `false`

开启后会当 ts 文件使用别名导入文件时, 如果 node 无法解析导入, 则会尝试根据 tsconfig.json 提供的 paths 去搜索, 注意, 查找的 tsconfig 文件 与 package.json 需要是同目录的

##### SAME_PARSER: ES Module 是否使用与 Commonjs 相同的解析策略

类型 `boolean` 默认 `false`
开启后 ES Module 将使用与 Commonjs 相同的模块解析策略

##### TS_COMPILER_OPTIONS: 全局的 ts 文件编译配置

类型 `string`

注意: 有些配置是会被覆盖的

例子: vscode debugger 配置

```
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

#### 配置案例

vscode 调试配置, 可以注入环境变量

```
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "ts debugger",
            "runtimeArgs": ["--loader", "./node_modules/@asnc/ts_hook/hook.mjs"], //使用loader
            "env": {    //注入环境变量
                "ENABLE_TS_ALIAS": "true",
                "SAME_PARSER": ""           //设置"" 即false
            },
            "sourceMaps": true,
            "program": "${file}"
        }
    ]
}

```

### node 导入模块的几种情况

-   直接运行包名
    ES Module 和 commonjs 的导入策略相同

-   使用绝对路径或相对路径导入
    ES Module 不支持扩展名查找, 不支持文件夹模块

-   使用包名导入
    ES Module 和 commonjs 的导入策略基本相同
    不同点: 当 package.json 不存在 exports 字段时, commonjs 可以导入子目录而 ES Module 不能

-   导入自身包
    ES Module 和 commonjs 的导入策略相同

-   使用'#'别名导入
    ES Module 和 commonjs 的导入策略相同

##### ts_hook 会尝试去除扩展名搜索 ts

ts_hook 在 ts 文件导入带有 .js .cjs .mjs 的扩展名会尝试去除进行搜索 ts 文件, 包括 package.json 中的 exports、imports、main 字段的处理

```
import "./a.cjs"    //  "./a.cjs" > "./a.cts"   >   node解析规则 require("./a.cjs")
import "./a.js"     //  "./a.js" > "./a.ts"     >   node解析规则 require("./a.js")
import "./a.mjs"    //  "./a.mjs"> "./a.mts"    >   node解析规则 require("./a.mjs")

```
