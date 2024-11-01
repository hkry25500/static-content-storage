"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cache_js_1 = require("./middlewares/cache.js");
const cors_1 = __importDefault(require("cors"));
const serve_js_1 = __importDefault(require("./routes/serve.js"));
const app = (0, express_1.default)();
const address = process.env.HOST_ADDR || '127.0.0.1';
const port = process.env.HOST_PORT || 8080;
// 中间件
// app.use(securityMiddleware);
app.use((0, cors_1.default)());
app.use(cache_js_1.cacheMiddleware);
// 路由
app.use('/static', serve_js_1.default);
app.listen(port, address, () => {
    console.log(`CDN server is running on port ${port}`);
});
