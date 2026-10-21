# 我的 AI 聊天（最简版）

一个零依赖、几行代码就能跑起来的 AI 聊天网页，接的是 DeepSeek。

## 这个项目里有啥

| 文件 | 干啥用 |
|------|--------|
| `server.js` | 后端：开网站 + 把消息转发给 DeepSeek |
| `index.html` | 前端：聊天界面（网页） |
| `README.md` | 就是你正在看的这个说明 |

## 原理（一句话）

```
你的浏览器  →  server.js（自己电脑上）  →  DeepSeek（别人的大模型）
```

密钥藏在 `server.js` 里，浏览器拿不到，这样才安全。

## 怎么跑起来（3 步）

### 第 1 步：申请一个 DeepSeek 密钥（免费注册，聊天才按量收费，很便宜）

1. 打开 https://platform.deepseek.com
2. 注册 / 登录
3. 左侧找到 **API keys**，点"创建"，复制那串 `sk-` 开头的密钥

### 第 2 步：把密钥填进代码

打开 `server.js`，找到这一行，把 `sk-在这里填你的key` 换成你的密钥：

```js
const DEEPSEEK_API_KEY = 'sk-在这里填你的key';
```

### 第 3 步：启动

在这个文件夹里打开命令行（PowerShell），运行：

```
node server.js
```

看到 `启动成功！` 后，打开浏览器访问：

```
http://localhost:3000
```

然后就能聊天了！按 `Ctrl + C` 可以关掉。

## 常见问题

- **一直转圈 / 报错"连不上 DeepSeek"**：检查网络能不能访问 api.deepseek.com，或密钥是否填对。
- **报错说"请先在 server.js 里填密钥"**：你还没替换那串占位符。
- **想让它回答更会推理**：把 `server.js` 里的 `deepseek-chat` 改成 `deepseek-reasoner`。

## 想升级（以后再玩）

- 打字机效果（流式输出）
- 记住对话历史（多轮对话）
- 接入别的模型（OpenAI / 本地 Ollama）
