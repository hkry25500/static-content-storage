import dotenv from 'dotenv';

dotenv.config();

import express from "express";
import { cacheMiddleware } from "./middlewares/cache.js";
import cors from 'cors'
import router from "./routes/serve.js";


const app = express();
const address = process.env.HOST_ADDR || '127.0.0.1';
const port = process.env.HOST_PORT || 8080;

// 中间件
// app.use(securityMiddleware);
app.use(cors())
// app.use(cacheMiddleware);

// 路由
app.use('/static', router);

app.listen(port as number, address, () => {
    console.log(`CDN server is running on port ${port}`);
    
})