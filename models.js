/**
 * 模型清单 —— 列出所有"可选的大脑"。
 *
 * 对照 C/Java 理解：
 *   这个数组 ≈ C 里的「结构体数组」 / Java 里的「一个类的对象列表」。
 *   数组里的每个元素 {} ≈ 一个 struct 实例 / 一个对象，字段就是 name/id/baseURL/apiKeyRef。
 *
 * 关键思想（这就是"抽象"）：
 *   之前 server.js 里是【写死】的 "deepseek-chat" 和 "api.deepseek.com"。
 *   现在把它们变成【配置】——以后想加新模型（比如 OpenAI、本地 Ollama），
 *   只需要在这个数组里【加一项】，不用改 server.js 的逻辑。
 *
 * 注意 apiKeyRef 字段：
 *   它存的是"钥匙的名字"（指向 config.js 里的某个字段），不是钥匙本身。
 *   钥匙是机密（在 config.js，不上传 GitHub），清单本身是公开的（这个文件会上传）。
 */

module.exports = [
  {
    name: 'DeepSeek 普通版',                 // 界面上显示的名字（给人看的）
    id: 'deepseek-chat',                     // 发给 DeepSeek 的模型编号（给机器看的）
    baseURL: 'https://api.deepseek.com',     // "门"的地址（API 接口地址）
    apiKeyRef: 'DEEPSEEK_API_KEY',           // 用 config.js 里的哪把钥匙
  },
  {
    name: 'DeepSeek 推理版',                 // 更会"思考"，回答更慢、更贵一点
    id: 'deepseek-reasoner',
    baseURL: 'https://api.deepseek.com',
    apiKeyRef: 'DEEPSEEK_API_KEY',
  },
  {
    name: 'DeepSeek V4 Pro',                 // 给人看的名字（可以随意）
    id: 'deepseek-v4-pro',                   // 给机器看的编号（必须是真实存在的）
    baseURL: 'https://api.deepseek.com',
    apiKeyRef: 'DEEPSEEK_API_KEY',
  },
];
