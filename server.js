/**
 * 一个极简 AI 聊天后端（Node.js，零第三方依赖）
 *
 * 本文件干三件事：
 *   1. 提供网页（GET / 返回 index.html）
 *   2. 提供模型清单（GET /api/models 返回可选模型，前端下拉框靠它）
 *   3. 核心：POST /api/chat —— 把【整段对话】转发给用户选中的模型，流式转发回浏览器
 *
 * 注释刻意用 C/Java 对照，帮你快速建立映射。
 */

// ==================== 1. 引入模块 ====================
// require ≈ C 的 #include / Java 的 import。
// http/https/fs/path 是 Node 自带的"标准库"；./ 开头的是我们自己写的文件。
const http = require('http');    // 当服务器：接收浏览器请求
const https = require('https');  // 当客户端：去请求 DeepSeek 等外部接口
const fs = require('fs');        // 读写文件（这里用来读 index.html）
const path = require('path');    // 处理路径

const MODELS = require('./models');               // 模型清单（数组，元素是对象）
const { DEEPSEEK_API_KEY } = require('./config'); // 密钥（该文件被 .gitignore 忽略，不上传）

const PORT = 3000;

// ==================== 2. 从 C/Java 到 JS 速查 ====================
//   变量：没有类型。const ≈ final（不可改），let ≈ 普通变量（可改）。动态类型。
//   对象：{} 就是 struct/对象，不用预先定义类型，直接 { name:'x', age:1 }。
//   数组：[] ，长度可变，可装任意类型。
//   函数：能当参数传（≈ C 函数指针 / Java lambda），这叫"回调"。
//   console.log(...) ≈ printf。

// ==================== 3. 最重要的新概念：异步（非阻塞）====================
// C/Java 里"从网络读数据"会【卡住等】；Node 里【不等】，先干别的，
// 等结果回来了再用一个"回调函数"通知你。
// 比喻：C/Java 是"打电话订餐、一直举着电话等"；Node 是"挂了电话干别的，好了再打回来"。
// 所以下面到处是 function(x){...} 被当参数传，这就是"回调"。
// 这也是你从 C/Java 过来最需要适应的点：几乎看不到"返回值"，看到的是"回调函数"。

// ==================== 4. 建服务器 ====================
// http.createServer(回调)：造一个服务器，每当有浏览器访问，就调用这个回调。
// 参数 req=请求（Request），res=响应（Response）。这就是"事件驱动"。
const server = http.createServer(function (req, res) {

  // ----- 情况 A：GET / 或 /index.html → 返回网页 -----
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html')); // 同步读文件（小文件用同步没问题）
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // ----- 情况 B：GET /api/models → 返回可选模型（但【不泄露密钥】）-----
  if (req.method === 'GET' && req.url === '/api/models') {
    // map ≈ 遍历数组，把每个元素映射成新元素，返回新数组。
    // 这里只把"名字"和"id"发给前端，baseURL、钥匙引用等内部信息不外传。
    const list = MODELS.map(function (m) {
      return { name: m.name, id: m.id };
    });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(list)); // JSON.stringify ≈ 把对象序列化成字符串
    return;
  }

  // ----- 情况 C：POST /api/chat → 转发对话给选中的模型（多轮 + 流式）-----
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', function (chunk) { body += chunk; }); // 数据是"流"进来的，一段段收集
    req.on('end', function () {                           // 收完才处理（这就是异步回调！）
      try {
        // JSON.parse ≈ 把 JSON 字符串还原成对象（像 Java 的反序列化）。
        // 解构赋值：从 body 解析出的对象里，直接取出 modelId 和 messages 两个字段。
        const { modelId, messages } = JSON.parse(body);

        // 在清单里找到用户选的那个模型。find ≈ 遍历数组，返回第一个匹配的元素。
        const model = MODELS.find(function (m) { return m.id === modelId; });
        if (!model) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '未知的模型：' + modelId }));
          return;
        }

        // 根据模型的 apiKeyRef（钥匙名字），取出对应的真钥匙。
        // 目前只有一把 DEEPSEEK_API_KEY，写成映射表是为了以后好扩展。
        const apiKey = { DEEPSEEK_API_KEY: DEEPSEEK_API_KEY }[model.apiKeyRef];
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '缺少钥匙：' + model.apiKeyRef }));
          return;
        }

        // 组装发给模型的请求体：system（人设）+ 整段历史。
        // ...messages 是"展开操作符"：把数组元素一个个摊开接进来（≈ Java 的集合展开）。
        const payload = JSON.stringify({
          model: model.id,   // 用哪个模型（现在是配置，不再是写死）
          messages: [
            { role: 'system', content: '你是一个有帮助的中文助手。' },
            ...messages,
          ],
          stream: true,      // 流式：一个字一个字吐
        });

        // 从 baseURL 里抠出"主机名"。
        // 正则 /^https?:\/\// 去掉开头的 http(s)://，/\/.*$/ 去掉第一个 / 之后的部分。
        const host = model.baseURL.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        const options = {
          hostname: host,
          path: '/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
            // 注意：必须用 Buffer.byteLength 而非 .length，
            // 因为中文一个字符占多个字节，.length 算的是"字符数"不是"字节数"。
            'Content-Length': Buffer.byteLength(payload),
          },
        };

        // https.request：以客户端身份发请求（异步，结果在回调里拿）。
        const upstream = https.request(options, function (upstreamRes) {

          // 状态码 >=400 说明模型那边报错（比如密钥错），读完整错误返回给前端。
          if (upstreamRes.statusCode >= 400) {
            let errData = '';
            upstreamRes.on('data', function (c) { errData += c; });
            upstreamRes.on('end', function () {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: '模型报错：' + errData }));
            });
            return;
          }

          // 告诉浏览器：接下来是流式文本，别缓存。
          res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
          });

          // 逐块解析 SSE（Server-Sent Events）：格式是"一行行 data: {...}"。
          // 因为网络是分块来的，一个完整 JSON 可能被从中间截断，所以用 buffer 拼接。
          let buffer = '';
          upstreamRes.on('data', function (chunk) {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 最后一行可能不完整，留着下次拼

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue; // 不是数据行就跳过
              const data = trimmed.slice(5).trim();       // 去掉开头的 "data:"
              if (data === '[DONE]') continue;            // 结束标记，跳过

              try {
                const json = JSON.parse(data);
                const delta = json.choices && json.choices[0] && json.choices[0].delta;
                const text = delta && delta.content ? delta.content : '';
                if (text) res.write(text); // 立刻写给浏览器 → 打字机效果
              } catch (e) {
                // 个别行解析不了就跳过，不影响整体
              }
            }
          });

          upstreamRes.on('end', function () { res.end(); }); // 流结束
        });

        upstream.on('error', function (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '连不上模型：' + err.message }));
        });

        upstream.write(payload);
        upstream.end();

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '收到坏数据：' + String(e) }));
      }
    });
    return;
  }

  // ----- 其他：404 -----
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('没有这个东西');
});

server.listen(PORT, function () {
  console.log('启动成功！打开浏览器访问：http://localhost:' + PORT);
});
