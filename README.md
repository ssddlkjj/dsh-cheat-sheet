# dsh-cheat-sheet

A per-conversation cheat sheet: one short reminder injected into the system prompt on every turn, switched and edited from the status bar.

Generic by design — it does not know your character. It ships with a "talk like a person" default and can be rewritten into a pure work brief.

---

## 1. Read this first (common surprises)

1. **It is per conversation.** Another conversation has another switch; a newly opened one starts stopped.
2. **The default is chat-flavoured** — short sentences, no bullet lists in speech, one expression only when there is an action, results in three sentences. Nothing about any particular character.
   Chat-flavoured does not mean chat-only: it works for ordinary work too, just less formal. It governs *how things are said*, not whether they are correct — numbers, paths and conclusions still follow your own rules.
3. **Settings live in the browser**, per conversation (`localStorage`, key `cheat.sheet.<sessionId>`). Clearing site data loses them; they do not carry over.
4. **It takes effect on the next turn**, not the message already being generated.
5. **Longer is worse.** Keep it under ~150 characters. A short system-prompt addendum gets followed; a long one gets ignored.
6. **It does not edit your persona files.** It only adds one paragraph per turn.
7. **Two default copies exist** — one in `index.js`, one in `client.js`. If you change the default text, change both, or "恢复默认" will bring back the old one.

---

## 2. How to use it

**Where it is.** The status bar under the message box — the row with `tok/s` and the cache hit rate. A new item sits there:

- `小抄·停` — off
- `小抄·开` — on

**Left click** toggles it. While switching on, a short note appears next to it (`已开 · 装上了` / `已开 · 没装上`), which is the quickest way to see whether the prompt section actually attached.

**Right click** opens an editor with the current text:

- edit, then **Ctrl+Enter** (or the save button) to save
- **Esc** or clicking outside cancels
- **恢复默认** restores the shipped text
- up to 600 characters

**Where it is stored.** Per conversation, in this browser. Edit once, and every following turn in that conversation carries it.

**How it affects replies.** Before each request the text is added as a system-prompt section. You never see it in the transcript; the model does.

---

## 3. How it works

```
client.js   draws the button and the editor; posts { enabled, hint } to the host
index.js    keeps per-conversation state
            on agent/created it captures that agent, then registers a scoped
            systemPrompt section (name: cheat-sheet:hint, order 9000)
            turning it off disposes the section; editing reinstalls it
```

The section is registered through `agent.ctx`, so it applies to that agent only. That is also why the default is "off": no conversation gets text it did not ask for.

---

## 4. Three ready-made texts (paste into the editor)

**A · template: chat + work (default, start here)**

```
说话像人：短句，一句一行；不摆清单、不归纳成金句、不写承诺句。
奥卡姆剃刀：能删的多余先删，再动手。
干活时：数字、路径、结论一个字不改；报结果三句。
改或复述规则时，先照抄原文，再动，不凭记忆重写。
```

**B · alternative: chat only**

```
说话像人：短句，一句一行；不摆清单、不归纳成金句、不写承诺句。
奥卡姆剃刀：能删的多余先删，再动手。
```

If your character keeps an expression list (kaomoji, action words), add one line yourself:
`有动作才带一只表情，单轮最多一只；写法照那清单。` — skip it if they have none.

**C · alternative: work only**

```
结论在前，数字、路径、命令一个字不改。
报结果三句：改了什么、现在什么样、你需要做什么。
不确定就说不确定，不猜、不编进度。
不写寒暄、不写承诺句、不摆清单。
改或复述规则时，先照抄原文，再动，不凭记忆重写。
```

The bundle ships with A. To switch, right-click, paste B or C, save, leave it on.

## 5. After installing: one step for your AI assistant

The shipped text is generic. Send this to your assistant if you want it tailored:

> "I just installed `dsh-cheat-sheet`. Please rewrite the default hint so it fits my character — speech habits, how often expressions appear, how results are reported. Keep it under 150 characters, and update `DEFAULT_HINT` in both `index.js` and `client.js` so they match."

Two places can be changed:

1. the text in the right-click editor (this conversation only), or
2. `DEFAULT_HINT` in both files (the default for every new conversation).

Refresh the page afterwards.

---

## 6. Install

Put this folder somewhere stable, then in DSH:

```
plugin_manager
  action: install_bundle
  target: <absolute path to this folder>
```

Restart DSH or refresh the page. The status-bar item appears on the next conversation.

---

## License

MIT.
