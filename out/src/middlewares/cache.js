"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const enums_1 = require("../shared/enums");
const cache = new node_cache_1.default({ stdTTL: parseInt(process.env.CACHE_TIME_TO_LIVE_SECONDS, 10) });
const cacheMiddleware = (req, res, next) => {
    console.log(`[Cache Middleware]: Request from ${req.url}`);
    const key = req.originalUrl;
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
        console.log('Memory cache hit ' + `[${cachedResponse.type}]`);
        if (cachedResponse.type === enums_1.NodeCacheType.Json) {
            res.json(cachedResponse.value);
        }
        else {
            res.sendFile(cachedResponse.value);
        }
    }
    else {
        const originalSend = res.sendFile.bind(res);
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            const cacheObj = { type: enums_1.NodeCacheType.Json, value: body };
            cache.set(key, cacheObj);
            return originalJson(body);
        };
        res.sendFile = (body) => {
            const cacheObj = { type: enums_1.NodeCacheType.Text, value: body };
            cache.set(key, cacheObj);
            return originalSend(body);
        };
        console.log('No cached response, proceeding...');
        next();
    }
};
exports.cacheMiddleware = cacheMiddleware;
