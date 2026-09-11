---
title: "27 · interactive-mode.ts — 键盘变成 session.prompt 的皮"
summary: "这是产品里最大的一张皮。读完必须能从源码指出："
tags: [pi, coding-agent]
---
源码：`packages/coding-agent/src/modes/interactive/interactive-mode.ts`（约 6620 行）  
被谁调用：`main.ts` 在交互模式 `new InteractiveMode(runtime, options); await mode.run()`。

## 本课目标

这是产品里最大的一张皮。读完必须能从源码指出：

1. `run()` / `init()` 各自干什么、TUI 何时 `start`。
2. 一次回车如何变成 `session.prompt`（以及流式时为什么变成 steer）。
3. `session.subscribe` 的事件如何变成聊天气泡。
4. 和 `@earendil-works/pi-tui` 的边界：谁处理 raw mode，谁处理 Agent。

跟执行路径不要在本文件里找模型 HTTP。本文件几乎不 import `pi-ai` 的 stream。调用 `prompt` 的方式和 [10-print-mode.ts.md](/series/pi-source/coding-agent/476-print-mode-ts/) 相同。

## 在系统中的位置

```text
main 决定 interactive
  new InteractiveMode(runtimeHost, { initialMessage, tuiMode, ... })
  await mode.run()
    await init()
      建组件树、ui.start()、ensureTool(fd/rg)
      setupKeyHandlers / setupEditorSubmitHandler
      rebindCurrentSession → bindExtensions(mode:"tui") + subscribe
      renderInitialMessages
    后台：刷模型目录、查版本、tmux 警告
    若有 initialMessage：await session.prompt(...)
    while (true)
      text = await getUserInput()     ← 等编辑器 onSubmit
      await session.prompt(text)
```

对比 print：print 把 argv 里的句子一次性 `prompt` 完就 dispose。交互把「下一句」变成一个挂起的 Promise，由键盘 resolve。

---

## 和 tui 包的关系

| 职责 | 在哪 |
|---|---|
| stdin raw mode、Kitty 键盘、bracketed paste、差量渲染 | `pi-tui` 的 `TUI.start/stop`、`Terminal` |
| 组件接口 `render(width): string[]`、`handleInput(data)`、焦点 | `pi-tui` Component / Editor / SelectList |
| 选 MainScreen 还是 AltScreen、复制、点链接 | 本包 `tui-renderer.ts` |
| 把 Agent 事件变成组件、斜杠命令、扩展 UI | **本文件** |
| `session.prompt` / 工具 / 压缩 | `AgentSession`，本文件只调用 |

本文件持有：

- `renderer: TuiMainScreen | TuiAltScreen` — 真正的 Screen。
- `ui: TUI` — `createInteractiveTuiReference` 的 Proxy，切 fullscreen 时组件不用换句柄。
- `defaultEditor: CustomEditor` — 继承 tui 的 `Editor`，在 `handleInput` 里先匹配 `app.*` keybinding。
- 一堆 `Container`：header / loadedResources / chat / pending / status / widgets / footer。

键盘路径：

```text
tty → ProcessTerminal → TUI 把字节交给 focused 组件
  CustomEditor.handleInput(data)
    扩展 shortcut？
    app.clipboard.pasteImage？
    app.interrupt（Esc）→ onEscape
    app.exit 且空编辑器 → onCtrlD
    其它 app.* → actionHandlers（切模型、fork、…）
    否则 super.handleInput → 插入字符 / 提交
      Editor 在 Enter 时调 onSubmit(text)
        setupEditorSubmitHandler
          斜杠命令 | !bash | 压缩期入队 | 流式 steer | 正常 → onInputCallback
            getUserInput 的 Promise resolve
              run() 的 while：session.prompt(userInput)
```

所以：**tui 包只负责「这串字节是提交」；本文件决定提交意味着 prompt、slash 还是 bash。**

---

## 构造函数

参数：`AgentSessionRuntime` + `InteractiveModeOptions`（迁移警告、启动诊断、initialMessage、tuiMode、initialThemeSetting…）。

关键副作用：

1. `setCapabilityOverrides(settings)` — 终端能力（truecolor 等）可被设置强制。
2. `runtimeHost.setBeforeSessionInvalidate(() => resetExtensionUI())` — 换会话前拆掉扩展 widget，避免指向旧 session 的组件。
3. `setRebindSession` → `rebindCurrentSession({ renderBeforeBind: true })` + 主题从设置再 apply。fork/resume 走这里。
4. `createInteractiveTui` 建 Screen；`createInteractiveTuiReference` 建 `this.ui`。
5. 组件树：`documentContainer = header + loadedResources + chat`。editor、footer、widget 容器单独建。
6. `KeybindingsManager.create()` + `setKeybindings` 写进 tui 全局，SelectList 的确认键才能跟用户配置走。
7. `new CustomEditor(..., { embedWorkingStatus: true })` — Working 转圈画在编辑器顶边框，不另占一行（除非扩展换了 editor）。
8. `FooterComponent(session, FooterDataProvider(cwd))` — footer 自己读 session 算 token，git 分支由 provider 监视。
9. `setRegisteredThemes` + `InteractiveThemeController` — 此时 TUI 还未 start，OSC 探测留到 `applyFromSettings`。

构造**不** `ui.start()`，不订 Agent 事件。那是 `init` 的事。

---

## `init()`

幂等：`isInitialized` 为真直接 return。`handleEvent` 在极端情况下会 `await init()`（事件先于 init 完成）。

顺序有讲究：

### 1. 信号

`registerSignalHandlers`：SIGTERM/SIGHUP 走 `shutdown({ fromSignal: true })`；stdout/stderr `EIO/EPIPE/ENOTCONN` 走 `emergencyTerminalExit`（终端没了，不要再写 restore 序列）；`uncaughtException` 走 `uncaughtCrash`（先 `ui.stop()` 恢复 cooked mode，再打印错误）。

### 2. 组布局并 **先 start TUI**

`createChatViewport` + `mountInteractiveTui`。然后：

```ts
this.defaultEditor.onSubmit = (text) => this.handleStartupSubmit(text);
this.ui.setFocus(this.editor);
this.ui.start();
this.isInitialized = true;
await this.themeController.applyFromSettings();
```

**扩展 `session_start` 可能弹对话框**，所以 TUI 必须在 `bindExtensions` 之前进入 raw mode。start 之后、key handler 装完之前，提交只 `showStatus("Startup is still in progress")`，文字留在编辑器里。Ctrl+C / Ctrl+D 已经可用，避免启动下载 fd 时卡死无法退出。

### 3. 画 header

非 quiet：可展开的 logo + 键位说明（`ExpandableText`，`app.tools.expand` 切换）。quiet：空 Text，占位给扩展 `setHeader` 替换。

### 4. `ensureTool("fd")` / `ensureTool("rg")`

挂载 TUI 之后再下载，状态走 `showManagedToolStatus` 写进 chat，而不是冻在「黑屏等网络」。fd 给 `@` 文件自动补全；rg 给 grep 工具。

### 5. 完整键盘

`setupKeyHandlers()` + `setupEditorSubmitHandler()`。从此回车是真提交。

### 6. `rebindCurrentSession()`

见下一节。然后 `renderInitialMessages()`（历史气泡）。主题文件 watcher、git 分支 watcher、provider 计数。`renderNow()` 把启动帧刷出去，再后台 `loadAllHighlightLanguages()`，避免语法包堵住第一帧。

---

## `rebindCurrentSession` / `bindCurrentSessionExtensions`

换会话或第一次绑定时：

1. 退订旧 `session.subscribe`。
2. `applyRuntimeSettings()`：HTTP 空闲超时、滚动条、footer 换 session 对象、编辑器 padding、硬件光标。
3. 可选先 `renderCurrentSessionState`（清空 chat 画历史）再订阅，避免绑定扩展时已经在流式却没有组件。
4. `bindCurrentSessionExtensions`：
   - `mode: "tui"`
   - `uiContext: createExtensionUIContext()` — 把 `ctx.ui.select` 接到 `showExtensionSelector` 等
   - `commandContextActions`：`newSession` / `fork` / `navigateTree` / `switchSession` / `reload` 转到 `runtimeHost` 或本文件的 UI 流程（fork 成功会 `editor.setText(selectedText)`）
   - `abortHandler`：扩展要求停时把队列抽回编辑器
   - `shutdownHandler`：设标志，idle 则立刻 shutdown
5. 重建自动补全、扩展 shortcut、资源列表、changelog 公告。

`createExtensionUIContext` 是交互相对 RPC 多出来的全部 UI 能力：真组件、真 editor、`pasteToEditor` 用 bracketed paste 序列喂 `handleInput`，主题读写走 controller。

---

## `run()`

`await init()` 之后不阻塞主循环的后台任务：

- `refreshModelCatalogs`（15s abort，`PI_OFFLINE` 跳过）
- `checkForNewPiVersion` → 聊天气泡通知
- `checkForPackageUpdates` → 通知；Windows 上 npm 可能改 console title，完了要 `updateTerminalTitle`
- `checkTmuxKeyboardSetup` — tmux 没开 `extended-keys` 时快捷键残缺

然后把 `startupDiagnostics` / 迁移警告 / models.json error / model fallback / Anthropic 订阅扣费警告画进 chat。

**启动 prompt**（来自 `-p` 在 TTY 下仍开交互、或 `prepareInitialMessage`）：

```ts
if (initialMessage) await this.session.prompt(initialMessage, { images: initialImages });
for (const message of initialMessages) await this.session.prompt(message);
```

和 print 一样串行 await。失败只 `showError`，不退出——用户还能继续打字。

**主循环：**

```ts
while (true) {
  const userInput = await this.getUserInput();
  try {
    await this.session.prompt(userInput);
  } catch (e) {
    this.showError(...);
  }
}
```

`getUserInput`：若 `pendingUserInputs` 有积压（用户在上一轮 prompt 还未 await 回来之前又提交了——正常路径其实走 steer，见下），先 shift；否则挂 `onInputCallback`。`shutdown` 会 `process.exit`，这个循环不必有 break。

---

## 键盘如何变成 prompt：`setupEditorSubmitHandler`

`CustomEditor.onSubmit` 在 tui Editor 判定「这一帧是提交」之后调用，参数是编辑器全文。

处理顺序（命中即 `return`，多数会 `editor.setText("")`）：

1. **内置斜杠**：`/settings` `/model` `/thinking` `/export` `/import` `/share` `/copy` `/name` `/session` `/changelog` `/hotkeys` `/fork` `/clone` `/tree` `/trust` `/login` `/logout` `/new` `/compact` `/reload` `/debug` `/resume` `/quit` 以及两个彩蛋。这些**不**进 `session.prompt`。它们直接改设置、开选择器、或 `runtimeHost.newSession`。
2. **`!` / `!!` bash**：`handleBashCommand`。扩展 `user_bash` 可拦截。流式中 bash 组件先挂在 `pendingMessagesContainer`，下一句正式 prompt 前 `flushPendingBashComponents` 搬进 chat。
3. **正在 compact**：扩展命令仍 `session.prompt`（立即执行）；普通句子 `queueCompactionMessage(..., "steer")`，等 `compaction_end` 再 `flushCompactionQueue`。
4. **正在 streaming**：`session.prompt(text, { streamingBehavior: "steer" })`。这是关键：交互里「模型还在说话时回车」不是再开一轮，是 steer 入队。`AgentSession.prompt` 自己认 streamingBehavior。
5. **空闲**：`flushPendingBashComponents()`，然后：
   ```ts
   if (this.onInputCallback) this.onInputCallback(text);
   else this.pendingUserInputs.push(text);
   ```
   也就是 resolve `getUserInput()`，让 `run()` 的 `session.prompt(userInput)` 跑起来。历史 `editor.addToHistory`。

注意第 5 步**不在 onSubmit 里 await prompt**。否则 Editor 的提交回调会卡住，Esc 进不来。await 放在 `run()` 循环，和 print 的「皮等待 prompt 结束」同一语义，只是下一句来自 Promise 而不是数组。

流式 steer 却在 onSubmit 里 await `session.prompt(..., steer)`：因为这次 prompt 很快（只入队），必须立刻 `updatePendingMessagesDisplay`。

### 编辑器内容变化

`onChange`：文本 trimStart 以 `!` 开头则 `isBashMode`，边框改 `bashMode` 色。

### Esc `onEscape`

优先：streaming → 把队列抽回编辑器并 abort；bash 跑着 → `abortBash`；bash 模式空转 → 清 `!`；空编辑器双击 Esc → 按设置打开 `/tree` 或 `/fork`。压缩/重试期间 `onEscape` 被暂时换成 `abortCompaction` / `abortRetry`，结束再换回来。

---

## `subscribeToAgent` / `handleEvent`

`this.unsubscribe = this.session.subscribe(async (event) => this.handleEvent(event))`。每次事件先 `footer.invalidate()`（token 变了）。

| 事件 | 画面 |
|---|---|
| `agent_start` | 清空 `pendingTools`；若还停在 retry 的 Esc 处理，换回主 handler |
| `turn_start` | 终端 progress bar；Working 转圈（或按扩展 `setWorkingVisible(false)` 不画） |
| `queue_update` | 重画 pending 区的 steer/follow-up 文本 |
| `entry_appended` custom | `CustomEntryComponent` |
| `session_info_changed` | 窗口标题、footer |
| `thinking_level_changed` | footer、编辑器边框色 |
| `message_start` user/custom | 立刻 `addMessageToChat` |
| `message_start` assistant | **新建** `AssistantMessageComponent`，标 streaming，挂到 chat |
| `message_update` | `streamingComponent.updateContent`；新 toolCall 则建 `ToolExecutionComponent` 放进 `pendingTools` |
| `message_end` assistant | 定稿；aborted/error 则所有 pending 工具标错；否则 `setArgsComplete` 触发 edit diff；cache miss 提示 |
| `tool_execution_start/update/end` | 对 pending map 里的组件 `markExecutionStarted` / `updateResult` |
| `agent_end` | 停 progress、清 working、若还有半截 streaming 组件则摘掉 |
| `agent_settled` | `checkShutdownRequested` |
| `compaction_start/end` | Compaction 转圈；成功则 `chatContainer.clear` + 按压缩后 entries 重画 + summary 气泡 |
| `auto_retry_*` / `summarization_retry_*` | Retry / BranchSummary 转圈 |

`addMessageToChat` 按 role 分支：user（可拆 skill 块）、assistant、bashExecution、compactionSummary、branchSummary、custom。`toolResult` 不单独画，匹配到工具组件。

历史重放 `renderSessionEntries`：从 `sessionManager.buildContextEntries()` 展开，工具调用和结果配对，cache miss 从 entries 再推导一遍（不落盘）。

---

## 选择器 `showSelector`

所有 `/model` `/resume` `/tree` 把 **editorContainer 里的编辑器换成选择器**，`ui.setFocus` 到列表。`done()` 再把 editor 装回去。`activeSelectorToken` 防止异步回调关错一次对话框。

这和扩展 `ctx.ui.select` 是同一槽位：同时只能有一个。新的 `showSelector` 会 `disposeActiveSelector`。

---

## 关闭

交互退出（Ctrl+D、连按 Ctrl+C、`/quit`、扩展 shutdown 且 idle）：

1. `themeController.disableAutoSync`
2. `terminal.drainInput(1000)` — SSH 上 Kitty 释放键别漏到 shell
3. `stop()` — 退订、停 TUI（fullscreen 可先切 regular 把 transcript 留在主屏）
4. `runtimeHost.dispose()` — 扩展 `session_shutdown`
5. 若会话已落盘，stdout 打 `To resume this session: pi --session <id>`
6. `process.exit(0)`

信号路径**相反**：先 `dispose`（扩展清 socket，不写 tty），再 drain/stop。终端已死时 restore 写入会 EIO → `emergencyTerminalExit`（129），避免 #4144 那种热转。

`handleCtrlZ`：Unix 上 `ui.stop()` 恢复 cooked，`kill(0, SIGTSTP)` 挂起整组；`SIGCONT` 再 `ui.start()`。挂起期间用长 interval 保活 event loop，并忽略 SIGINT。

---

## 失败与边界

- `run()` 的 while 没有 catch 之外的退出。TUI 挂了靠信号/uncaught。
- 启动期 `handleStartupSubmit` 不丢文本，但也不入队。用户得再按一次回车。
- `session.prompt` throw（没模型）只 showError，编辑器已清空——用户要从 history 上一箭找回。slash 路径多数先清空再干活。
- 扩展 `setEditorComponent` 换掉 `this.editor`，但 key handler 注册在 `defaultEditor` 上，通过 `this.editor.getText()` 读当前编辑器。自定义编辑器必须实现同一套接口。
- 本文件不要当「业务层」。压缩算法、工具执行、会话 JSONL 都不在这里。

## 下一课

组件从编辑器开始：[28-components.index.ts.md](/series/pi-source/coding-agent/518-components-index-ts/)，然后 [33-custom-editor.ts.md](/series/pi-source/coding-agent/520-custom-editor-ts/)。
