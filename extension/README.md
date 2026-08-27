# VoiceIn for Canvas v2

在 Canvas LMS 的作业、讨论和消息编辑器中直接进行英语或中文语音输入。

## 安装

1. 下载并解压发布包。
2. 在 Chrome 打开 `chrome://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择 `extension` 文件夹。
5. 打开或刷新 Canvas 页面，并允许麦克风权限。

## 使用

点击 Canvas 输入框，把光标放到需要插入文字的位置，然后点击右下角 **Start**。再次点击 **Stop** 停止。也可以按 `Alt + Shift + Space` 开始或停止。

点击 Chrome 工具栏中的 VoiceIn 图标，可以设置默认语言、自动标点、自定义词汇和学校的自定义 Canvas 域名。

## v2 功能

- 在当前光标位置输入，尽量保留富文本格式
- 停顿后自动添加句号，可在设置中关闭
- 实时显示尚未确认的识别文字
- 自动保存最近一次听写，并可恢复
- 自定义词汇替换，例如 `you see ess see=UCSC`
- 设置页面添加任意学校 Canvas 域名
- `Alt + Shift + Space` 快捷键
- 清晰的听写状态和音量动画

## 标点口令

- 英语：`comma`、`period` / `full stop`、`question mark`、`exclamation point`、`colon`、`semicolon`、`new line` / `new paragraph`
- 中文：`逗号`、`句号`、`问号`、`感叹号`、`冒号`、`分号`、`换行` / `新段落`

## 编辑口令

- `undo` / `撤销`
- `delete last sentence` / `删除上一句`
- `select last paragraph` / `选择上一段`
- `capitalize that` / `首字母大写`

## 隐私

VoiceIn 不包含自己的服务器，也不上传或分析 Canvas 内容。语音识别由 Chrome 的 Web Speech API 提供；浏览器或其语音服务提供方可能处理音频。自定义词汇和恢复草稿仅保存在本机 Chrome 扩展存储中。

学校管理的电脑可能禁止安装开发者模式扩展。Canvas 编辑器版本不同，个别复杂格式可能需要先在编辑区中点击一次。

