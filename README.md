# DSH SillyTavern Card Writer

npm 包名：`dsh-stcardwriter`

面向 DeepSeek Harness `0.1.0-rc.8` 的 SillyTavern 创作插件。它新增“酒馆创作模式”Agent 预设和双区工作台：左侧直接连接 Harness 输入并管理项目资源，右侧编辑和实时预览角色卡、世界书与预设。

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
- 酒馆创作预设包含 DSH rc8 标准模式的文件、搜索、Shell、后台任务、技能、目标、计划、压缩、子 Agent、工作流、提问、Todo 与 Web 工具，并在其上追加 `tavern_*` 工具。
- 导出角色卡 PNG、V3 JSON、V2 JSON、V1 JSON 或 CHARX；保留导入 PNG 的原图并重写元数据。
- 编辑 SillyTavern 世界书原生条目并在右栏测试主/次关键词逻辑。
- 编辑 Chat Completion 提示列表并按 `prompt_order` 预览；Context、Instruct、TextGen 预设可保真编辑原始 JSON。
- 项目整体导出 ZIP，按 `characters/`、`worldbooks/`、`presets/` 分类。
- 原始 JSON 是持久化真源；结构化编辑不会主动删除未知字段或 `extensions`。
- 首次启动插件时，如目标不存在，自动安装 `$DSH_HOME/.agent-presets/tavern-authoring`；不会覆盖用户已修改的同名预设。

## 构建与测试

```powershell
npm install
npm test
npm pack
```

## 安装到 DSH rc8

从本目录生成 tarball 后，将其添加到你的 DSH profile（把 `default` 换成实际 profile 名）：

```powershell
dsh plugin --profile default add .\dsh-stcardwriter-0.2.0.tgz
dsh --profile default --dump-config
dsh --profile default
```

也可开发期直接链接当前目录：

```powershell
dsh plugin --profile default add .
```

启动后，侧栏底部以及会话输入工具栏会出现“酒馆创作”入口；新建会话时可选择“酒馆创作模式”预设。首次自动创建预设后如列表尚未刷新，重启一次 DSH Host。

每个 DSH 工作区的数据独立保存在 `<工作区>/.tavernres/projects`。`<项目 ID>.json` 只保存角色卡、世界书、预设及二进制引用；PNG 原图、CHARX/PNG 附件和二进制 Data URI 拆分到相邻的 `<项目 ID>.assets/` 目录，并用相对路径、字节数和 SHA-256 校验。移动工作区时将 `.tavernres` 整体迁移即可。

## 格式策略

- 角色卡：导入时保留原始对象；导出 V3 时补齐规范必需字段，额外字段继续保留。PNG 同时写入 V3 `ccv3` 和 V2 兼容 `chara` 文本块，并按规范读写 `chara-ext-asset_:{path}`。CHARX 保持根 `card.json` 与所有归档成员。
- 世界书：使用 SillyTavern 的 `{ "entries": { "uid": entry } }` 结构；编辑器提供其常用激活、顺序、概率和递归字段，其他字段可从原始 JSON 编辑。
- 预设：Chat Completion 使用 `prompts` + `prompt_order`；其他预设不进行猜测性转换。

## 安全与限制

- API 只挂载在 DSH 自身 WebServer 的同源 `/api/dsh-stcardwriter` 路径，不另开端口。
- 项目文件名只来自插件生成的 ID，写入使用同目录临时文件后原子替换。
- 单次导入请求上限 80 MiB。
- 右栏的世界书预览用于写作反馈，覆盖关键词、AND/NOT 选择逻辑；最终 token 预算、递归、分组竞争和概率结果仍以 SillyTavern 运行时为准。
