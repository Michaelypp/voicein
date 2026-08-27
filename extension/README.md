# VoiceIn for Canvas（Chrome 扩展）

在 Canvas LMS 页面中直接进行英语或中文语音输入。默认语言为英语。

## 安装

1. 下载本仓库并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions`。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本目录 `extension`。
5. 打开学校的 Canvas 页面并刷新。

## 使用

先点击 Canvas 中的作业、讨论或消息输入框，再点击右下角的 **Start**。首次使用时允许麦克风权限。再次点击 **Stop** 可停止。

### 标点口令

- 英语：`comma`、`period` / `full stop`、`question mark`、`exclamation point`、`colon`、`semicolon`、`new line` / `new paragraph`
- 中文：`逗号`、`句号`、`问号`、`感叹号`、`冒号`、`分号`、`换行` / `新段落`

例如说 “Hello comma how are you question mark”，会输入 “Hello, how are you?”。

扩展可在 `*.instructure.com` 以及 UCSC 的 `canvas.ucsc.edu` 页面运行。如果其他学校使用完全自定义的 Canvas 域名，需要在 `manifest.json` 的 `host_permissions` 和 `matches` 中加入该域名。

## 注意

- 推荐最新版 Chrome。
- 学校管理的电脑可能禁止安装开发者模式扩展。
- Canvas 的部分复杂编辑器可能需要先在编辑区内点击一次。

