# DSH SillyTavern Card Writer

[![MIT License](https://img.shields.io/badge/license-MIT-4b8f77.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-runtime-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

在 DeepSeek Harness 中创作、整理、预览和迁移 SillyTavern 角色卡、世界书与预设。当前插件版本：`0.5.2-alpha.2`；npm 包名：`dsh-stcardwriter`，目前尚未发布到 npm。

面向 DeepSeek Harness `0.1.2-alpha.3`，提供“酒馆创作模式”Agent 预设和三栏工作台：左侧连接 Harness 并管理项目，中间编辑资源，右侧整栏编辑世界书注入内容并可切换实时预览。内置本地 SillyTavern 连接器；提示词与伪装消息注入由直接依赖的 [DSH Preset Plus](https://github.com/Rain-kl/dsh-preset-plus) 统一提供。

当前本机运行验证基线为 DSH `0.1.2-alpha.3`，插件已通过 `dsh plugin --profile web add` 安装到本机 DSH 并通过供应链锁校验；兼容检查同样针对官方 `dsh-v0.1.2-alpha.3` 源码完成。插件不再直接声明 0.1.2 已删除的 `@deepseek-ai/dsh-client-runtime`，UI 使用新版仍保留的三个插槽；托管 Agent 组合 v4 同时覆盖 0.1.1 与 0.1.2 的标准工具行。可用 `npm run check:dsh-compat -- <DSH 源码目录>` 复查。

## 快速安装

```powershell
dsh plugin --profile web add github:bychv/dsh-stcardwriter
dsh --profile web --dump-config
dsh --profile web
```

安装或升级后重启 DSH Host。首次启动会创建 `tavern-authoring` 和 `preset-plus` 两个 Agent 模式。

## 开始使用

1. 在 DSH 设置的「预设增强」中创建、导入或激活 Preset Plus 预设。
2. 新建会话并选择「酒馆创作模式」。当前激活的 Preset Plus 预设会与完整 `tavern_*` 工具同时生效。
3. 从侧栏或会话输入栏打开「酒馆创作」，可以新建空项目，也可以批量导入 `.json`、`.png`、`.charx`、`.zip`。
4. 如需连接本机 SillyTavern，在左侧连接器填写安装根目录或 `data/<用户>` 目录。

## 功能

- 创建完全空的项目；在项目里新建任意数量的角色卡、世界书和预设。
- 一次选择多个 `.json`、`.png`、`.charx` 文件，或导入包含这些文件的 `.zip`。
- Character Card V1/V2/V3 识别；以 V3 为主进行编辑，PNG 优先读取 `ccv3`、回退 `chara`。
- 导入角色卡时检查 `character_book`；内嵌世界书可逐条写作并测试触发，始终随角色卡保存。
- 保留 CHARX 中 `card.json` 以外的任意文件，以及 PNG `chara-ext-asset_:` 二进制资源；导出会原样带回未知附属文件。
- 在角色卡之间选择性迁移非世界书 `data.assets` 和未引用附属文件；同路径不同内容会自动安全改名，绝不覆盖目标内嵌世界书。
- Agent 可通过 `tavern_character_resource_read` 按 ID、路径或 `data.assets` 下标读取 UTF-8/UTF-16 文本附件；支持分块读取，不会把附件 Base64 或二进制内容塞进上下文。
- Agent 项目读取采用低 token 分层：`tavern_project_get` 默认只返回资源和字段大小摘要，`tavern_asset_get` 再按字段读取，只有显式 `detail=full` / `fields=["*"]` 才返回完整 JSON。
- Agent 可用 `tavern_character_patch` 修改指定角色字段而不重传整卡；随卡世界书和独立世界书均支持分页、单条读取、增改、删除。
- `tavern_worldbook_entries_copy` 可在两张角色卡的内嵌世界书之间，或角色卡与独立世界书之间复制选定条目；ID 冲突可安全重编号、覆盖或跳过。
- `tavern_preset_convert_to_preset_plus` 只负责把 Chat Completion、System Prompt 或 Context 酒馆预设转换成项目内的 `preset-plus-preset` 草稿；可在中栏修改条目，并在右栏预览实际注入顺序。确认后再用 `tavern_preset_plus_write` 独立写入 Preset Plus，支持冲突改名/覆盖和写入后激活。动态 marker 会跳过并报告，不会伪造成静态提示词。
- 酒馆创作预设包含 DSH `0.1.2-alpha.3` 标准模式的文件、搜索、Shell、后台任务、技能、目标、计划、压缩、子 Agent、工作流、提问、Todo 与 Web 工具，并在其上追加 `tavern_*` 工具。
- 导出角色卡 PNG、V3 JSON、V2 JSON、V1 JSON 或 CHARX；保留导入 PNG 的原图并重写元数据。
- 酒馆连接器：填入本机酒馆安装根目录或用户数据目录，即可在工作台里浏览并勾选导入酒馆侧角色卡、世界书和五类预设；单张资源或整个项目可一键写回酒馆对应目录。
- Agent 可用 `tavern_connect_*` / `tavern_remote_*` 工具完成同样的连接、列举、导入与导出。
- 直接集成 `@rain-kl/dsh-preset-plus`：保留其 `preset-plus` 独立模式，并把 `tavern-authoring` 加入注入作用域；在酒馆创作模式中可同时使用完整 `tavern_*` 工具和 Preset Plus 当前激活预设。
- 编辑 SillyTavern 世界书原生条目；右栏整栏是当前条目的「注入内容」编辑窗（角色卡内嵌世界书同样适用，随条目选择联动），点击「资源实时预览」可切回原右栏预览。
- 编辑 Chat Completion 提示列表并按 `prompt_order` 预览；Context、Instruct、TextGen 预设可保真编辑原始 JSON。
- 项目整体导出 ZIP，按 `characters/`、`worldbooks/`、`presets/` 分类。
- 原始 JSON 是持久化真源；结构化编辑不会主动删除未知字段或 `extensions`。
- 首次启动插件时，如目标不存在，自动安装 `$DSH_HOME/.agent-presets/tavern-authoring`；不会覆盖用户已修改的同名预设。

## 本地包安装与开发

从源码构建 tarball 后安装：

```powershell
npm install
npm test
npm pack
dsh plugin --profile web add .\dsh-stcardwriter-0.5.2-alpha.2.tgz
```

开发期也可以直接链接当前目录：

```powershell
dsh plugin --profile web add .
```

启动后，侧栏底部以及会话输入工具栏会出现“酒馆创作”入口；新建会话时可选择“酒馆创作模式”预设。首次自动创建预设后如列表尚未刷新，重启一次 DSH Host。

每个 DSH 工作区的数据独立保存在 `<工作区>/.tavernres/projects`。`<项目 ID>.json` 只保存角色卡、世界书、预设及二进制引用；PNG 原图、CHARX/PNG 附件和二进制 Data URI 拆分到相邻的 `<项目 ID>.assets/` 目录，并用相对路径、字节数和 SHA-256 校验。移动工作区时将 `.tavernres` 整体迁移即可。

## 酒馆连接器

连接器通过**本地文件直连**与 SillyTavern 同步，不依赖酒馆的内部 HTTP 接口，也没有 CSRF/鉴权问题；酒馆无需处于运行状态，导出后在酒馆界面刷新即可看到新文件。

- **连接**：在工作台左侧“酒馆连接器”面板填入酒馆安装根目录（如 `F:\SillyTavern`，自动探测 `data/` 下的用户，多用户可选）或用户数据目录（如 `F:\SillyTavern\data\default-user`），点“探测”确认后保存。连接配置按工作区保存在 `<工作区>/.tavernres/connector.json`。
- **从酒馆导入**：按目录分组浏览 `characters/`、`worlds/`、`OpenAI Settings/`、`TextGen Settings/`、`context/`、`instruct/`、`sysprompt/`，勾选后导入当前项目。同一酒馆文件重复导入默认替换项目内既有资源（保留资源 ID 与创建时间），也可切换为新增副本。
- **导出到酒馆**：角色卡以 PNG 写入 `characters/`（文件名取卡面名，与酒馆 avatar 规则一致）；世界书写入 `worlds/`；预设按格式写入对应目录，无法识别格式时默认 `sysprompt/`（可显式指定）。同名冲突支持覆盖、改名（追加 ` (2)`）或跳过。
- **Agent 工具**：`tavern_connect_status`、`tavern_connect_configure`、`tavern_remote_list`（分页）、`tavern_remote_import`、`tavern_remote_export`。
- **REST API**：`GET/PUT/DELETE /api/dsh-stcardwriter/connector`、`POST /connector/probe`、`GET /connector/remote`、`POST /connector/import`、`POST /connector/export`。

## Preset Plus 共存

本插件固定依赖并加载 [`@rain-kl/dsh-preset-plus@0.1.5`](https://github.com/Rain-kl/dsh-preset-plus)。使用 npm 发布版是为了满足 DSH 的 `blockExoticSubdeps` 供应链策略；bundle 配置将其作用域设为 `preset-plus` 与 `tavern-authoring`：

- 选择 **PresetPlus** 模式时，行为与原插件一致。
- 选择 **酒馆创作模式**时，使用本插件的完整酒馆工具集，同时应用 Preset Plus 当前激活预设的 system/user/assistant 条目。
- 预设的创建、导入、导出、启用和激活统一在 DSH 设置页的「预设增强」中管理；本插件不再注册第二套 system prompt section，因此不存在双注入或两个 `complete` 段冲突。
- 不要在同一个 profile 中再次单独安装 `@rain-kl/dsh-preset-plus`；它已经由本插件作为直接依赖加载。

Preset Plus 0.1.5 的客户端清单仍带有旧 `dsh-client-runtime` 包边，但其浏览器插件实际只注入 `slots` 服务并通过 `slots.inject("settings.section", ...)` 注册界面；在 DSH `0.1.2-alpha.3` 中包边只用于信息展示，不决定激活顺序，因此该旧清单项不会阻塞加载。兼容检查脚本会同时验证这一点。

从旧版升级时，插件只会将内容与曾发布版本**精确一致**的 managed v2/v3 组合迁移为 v4；迁移补齐目标命令、子 Agent 模型选择设置和 Web fetch。只要旧预设有任何用户修改，插件就不会覆盖。

## 格式策略

- 角色卡：导入时保留原始对象；导出 V3 时补齐规范必需字段，额外字段继续保留。PNG 同时写入 V3 `ccv3` 和 V2 兼容 `chara` 文本块，并按规范读写 `chara-ext-asset_:{path}`。CHARX 保持根 `card.json` 与所有归档成员。
- 世界书：使用 SillyTavern 的 `{ "entries": { "uid": entry } }` 结构；编辑器提供其常用激活、顺序、概率和递归字段，其他字段可从原始 JSON 编辑。
- 预设：Chat Completion 使用 `prompts` + `prompt_order`；原始 JSON 始终保真保存。转换到 Preset Plus 时仅提取可静态注入的提示词，动态 marker 会跳过并报告，纯参数型 Instruct/TextGen 预设不会被猜测性转换。

## 安全与限制

- API 只挂载在 DSH 自身 WebServer 的同源 `/api/dsh-stcardwriter` 路径，不另开端口。
- 项目文件名只来自插件生成的 ID，写入使用同目录临时文件后原子替换。
- 单次导入请求上限 80 MiB。
- 连接器对酒馆目录的写入严格限制在七类资源子目录内，文件名净化后仍做越界检查，写入采用原子替换；连接器不提供删除酒馆文件的能力。
- Preset Plus 由 bundle 统一加载一次，并只对 `preset-plus`、`tavern-authoring` 两个模式启用。
- 右栏默认是所选世界书条目的「注入内容」整栏编辑窗（含角色卡内嵌世界书）；点击「资源实时预览」切回原预览，触发预览覆盖关键词、AND/NOT 选择逻辑。最终 token 预算、递归、分组竞争和概率结果仍以 SillyTavern 运行时为准。

## 致谢与贡献说明

- [Rain-kl/dsh-preset-plus](https://github.com/Rain-kl/dsh-preset-plus) 由 Rain-kl 及其贡献者开发，并以 MIT License 发布。它为本项目提供多预设数据模型与设置界面、system/user/assistant 条目注入、assistant 伪装输出预填充，以及独立的 `preset-plus` Agent 模式。本项目通过 npm 直接依赖使用这些能力，并负责 `tavern-authoring` 作用域组合、非目标模式隔离和酒馆工具兼容；相关上游成果与著作权归原作者和贡献者所有。
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) 社区维护了角色卡、世界书和预设生态，本项目围绕这些格式提供编辑与保真往返能力。
- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供插件、Agent 预设、工具和 Web UI 基础设施。

本项目自身使用 [MIT License](LICENSE)。第三方依赖分别遵循其各自许可证。
