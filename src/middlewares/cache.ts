import { NextFunction, Request, Response } from 'express';
import NodeCache from 'node-cache';
import { INodeCacheObject } from '../shared/interfaces';
import { NodeCacheType } from '../shared/enums';


const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TIME_TO_LIVE_SECONDS as string, 10) });

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) =>
{
    console.log(`[Cache Middleware]: Request from ${req.url}`);

    const key = req.originalUrl;
    const cachedResponse = cache.get(key) as INodeCacheObject;

    if (cachedResponse)
    {
        console.log('Memory cache hit '+`[${cachedResponse.type}]`);
        if (cachedResponse.type === NodeCacheType.Json)
        {
            res.json(cachedResponse.value);
        }
        // else
        // {
        //     res.sendFile(cachedResponse.value);
        // }
    }
    else
    {
        // const originalSend = res.sendFile.bind(res);
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            const cacheObj: INodeCacheObject = { type: NodeCacheType.Json, value: body };
            cache.set(key, cacheObj);
            return originalJson(body);
        }

        // res.sendFile = (body) => {
        //     const cacheObj: INodeCacheObject = { type: NodeCacheType.Text, value: body };
        //     cache.set(key, cacheObj);
        //     return originalSend(body);
        // };
    
        console.log('No cached response, proceeding...');
        next(); 
    }
};