/**
 * 一个最简的 AI 聊天服务器（零依赖，不装任何东西，纯 Node 自带功能）
 *
 * 它干两件事：
 *   1. 把网页(index.html)发给你浏览器
 *   2. 当你发消息时，把消息转发给 DeepSeek，再把回答拿回来
 *
 * 为什么要有这个"中间人"？
 *   - 密钥(key)放在浏览器里会被别人看到，不安全
 *   - 所以放在这里，浏览器只跟它说话，它才去跟 DeepSeek 说话
 */

const http = require('http');   // 开网站用的
const https = require('https'); // 去跟 DeepSeek 说话用的
const fs = require('fs');       // 读文件用的
const path = require('path');   // 处理文件路径用的

// ★★★ 密钥现在存在 config.js 里（那个文件不会传到 GitHub，安全）★★★
// 去哪申请：https://platform.deepseek.com  → 注册登录 → 左侧"API keys" → 创建
const { DEEPSEEK_API_KEY } = require('./config');

const PORT = 3000; // 本地端口，浏览器打开 http://localhost:3000

const server = http.createServer(function (req, res) {

  // —— 情况1：访问首页，把网页发出去 ——
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // —— 情况2：发消息，转发给 DeepSeek ——
  if (req.method === 'POST' && req.url === '/api/chat') {
    // 先把你浏览器发来的内容收集起来
    let body = '';
    req.on('data', function (chunk) { body += chunk; });
    req.on('end', function () {
      try {
        const { message } = JSON.parse(body); // 拿到你打的字

        if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.indexOf('填你的key') !== -1) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '请先在 server.js 里填上 DeepSeek 的密钥' }));
          return;
        }

        // 组一个 DeepSeek 要求的"请求"
        const payload = JSON.stringify({
          model: 'deepseek-chat', // 想用会推理的换成 'deepseek-reasoner'
          messages: [
            { role: 'system', content: '你是一个有帮助的中文助手。' },
            { role: 'user', content: message },
          ],
          stream: false,
        });

        const options = {
          hostname: 'api.deepseek.com',
          path: '/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + DEEPSEEK_API_KEY,
            'Content-Length': Buffer.byteLength(payload),
          },
        };

        // 发给 DeepSeek
        const upstream = https.request(options, function (upstreamRes) {
          let data = '';
          upstreamRes.on('data', function (chunk) { data += chunk; });
          upstreamRes.on('end', function () {
            try {
              const json = JSON.parse(data);
              if (json.error) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'DeepSeek 报错：' + json.error.message }));
                return;
              }
              const reply = json.choices[0].message.content;
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ reply: reply }));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: '解析 DeepSeek 返回失败：' + String(e) }));
            }
          });
        });

        upstream.on('error', function (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '连不上 DeepSeek：' + err.message }));
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

  // —— 其他情况：说找不到 ——
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('没有这个东西');
});

server.listen(PORT, function () {
  console.log('启动成功！打开浏览器访问：http://localhost:' + PORT);
});
