import { Request, Response, Router } from 'express';
import path from 'path';
import { ensureDirSync } from 'fs-extra';
import { homedir } from 'os';
import fs from 'fs-extra'
import axios from 'axios';
import { getDirectories, isStreamFileAvailable } from '../utils';
import ffmpeg from 'fluent-ffmpeg'

const router = Router();
const folderPath = process.env.CONTENT_FOLDER_PATH || path.join(homedir(), './static');
const moviesDirPath = path.join(folderPath, './movies');

ffmpeg.setFfmpegPath(process.env.FFMPEG_EXECUTABLE_PATH as string);

ensureDirSync(path.join(folderPath, './movies'));

router.get('/movies', (_req: Request, res: Response) =>
{
    const movieDirs = getDirectories(moviesDirPath);
    const movies: any[] = [];

    for (const imdbID of movieDirs)
    {
        const movieDirPath = path.join(moviesDirPath, imdbID);
        
        try
        {
            const imdb_config = fs.readJSONSync(path.join(movieDirPath, 'imdb.config.json'));

            // 替换 imdb 配置文件中的 相对路径 到 完整请求路径
            imdb_config.sources.internal.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/stream.m3u8?from=internal`;

            if (imdb_config.poster.source === 'internal')
            {
                imdb_config.poster.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/poster`;
            }
            delete imdb_config.poster.source;

            movies.push(imdb_config);
        }
        catch (error)
        {
            return console.error('Invalid configuration detected:', error);
        }
    }

    res.json(movies);
});


let isInTask = false;

router.get('/movie/:imdbid/:prop?', (req: Request, res: Response) =>
{
    const imdbID = req.params.imdbid;
    const prop = req.params.prop;

    const movieDirPath = path.join(moviesDirPath, imdbID);
    
    // 使用 fs-extra 的 readJson 读取并解析 JSON 文件
    fs.readJson(path.join(movieDirPath, 'imdb.config.json'), (err, imdb_config) =>
    {
        if (err) {
            return console.error('Invalid configuration detected:', err);
        }

        if (prop)
        {
            switch (prop)
            {
                case 'source':
                    {
                        const from = req.query.from;

                        if (from === 'internal')
                        {
                            const internalSourcePath = imdb_config.sources.internal.url;
                            if (internalSourcePath)
                            {
                                return res.sendFile(path.join(movieDirPath, internalSourcePath));
                            }
                        }
                        else if (from === 'external')
                        {
                            const externalSourcePath = imdb_config.sources.external.url;
                            if (externalSourcePath)
                            {
                                // TODO: 为外部视频源提供反向代理
                                axios.get(externalSourcePath, { responseType: 'stream' })
                                .then(response => {
                                    res.set({
                                        'Content-Type': response.headers['content-type'],
                                        'Content-Length': response.headers['content-length']
                                    });
                                    response.data.pipe(res);
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    res.status(500).send('Error streaming video');
                                });
                            }
                        }
                        else
                        {
                            return res.status(500).send('Bad Request');
                        }
                    }
                    break;

                case 'stream.m3u8':
                    {
                        const from = req.query.from;

                        if (from === 'internal')
                        {
                            const internalSourcePath = imdb_config.sources.internal.url;
                            if (internalSourcePath)
                            {
                                const filePath = path.join(movieDirPath, internalSourcePath);
                                const resolution: string = req.query.quality as string || '480p';

                                let size: string;
                                switch (resolution)
                                {
                                    case '1080p':
                                        size = '1920x1080';
                                        break;
                                    case '720p':
                                        size = '1280x720';
                                        break;
                                    case '480p':
                                        size = '854x480';
                                        break;
                                    default:
                                        size = '1280x720'; // 默认720p
                                        break;
                                }

                                res.setHeader('Content-Type', 'video/MP2T');

                                const outputDir = path.join(movieDirPath, `/${resolution}`);
                                const outputFilePath = path.join(outputDir, './stream.m3u8');

                                const isTemped = isStreamFileAvailable(outputFilePath);
                                if (isTemped)
                                {
                                    return res.sendFile(outputFilePath);
                                }

                                if (isInTask)
                                {
                                    return res.status(503).send('Compile in progress');
                                }

                                //TODO: 这就是实时流式传输了，没考虑清楚要不要留
                                isInTask = true;

                                fs.ensureDirSync(outputDir);

                                // 使用 FFmpeg 转换为 HLS
                                ffmpeg(filePath)
                                    .outputOptions([
                                        // '-preset veryfast',
                                        '-g 60',
                                        '-sc_threshold 0',
                                        // '-map 0',
                                        '-f hls',
                                        '-hls_time 60',
                                        '-hls_list_size 0',
                                        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
                                        '-threads 4',
                                    ])
                                    .videoCodec('libx264')
                                    .size(size)
                                    .output(outputFilePath)
                                    .on('end', () => {
                                        isInTask = false;
                                        res.sendFile(outputFilePath);
                                    })
                                    .on('progress', (progress) => {
                                        console.log(`${progress.timemark} ${progress.percent}%`);
                                    })
                                    .on('error', (err) => {
                                        isInTask = false;
                                        fs.removeSync(outputDir);
                                        console.error('Error:', err.message);
                                        res.status(500).send('Error processing video');
                                    })
                                    .run();
                            }
                        }
                        else if (from === 'external')
                        {
                            return res.status(501).send();
                        }
                    }
                    break;

                case 'poster':
                    {
                        const poster = imdb_config.poster;
                        if (poster.source === 'internal')
                        {
                            return res.sendFile(path.join(movieDirPath, poster.url));
                        }
                        else if (poster.source === 'external')
                        {
                            axios.get(poster.url, { responseType: 'stream' })

                                .then(response => response.data.pipe(res))

                                    .catch(__error => res.status(500).send())
                        }
                    }
                    break;
                
                default:
                    {
                        const resolution = req.query.quality as string || '480p';

                        const segmentPath = path.join(movieDirPath, resolution, prop);
                        console.log(segmentPath);
                    
                        if (!fs.existsSync(segmentPath)) {
                            res.status(404).send('Segment not found');
                        }
                    
                        res.setHeader('Content-Type', 'video/MP2T');
                        res.sendFile(segmentPath);
                    }
                    break;
            }
        }
        else
        {
            imdb_config.sources.internal.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/stream.m3u8?from=internal`;

            if (imdb_config.poster.source === 'internal')
            {
                imdb_config.poster.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/poster`;
            }
            delete imdb_config.poster.source;

            return res.json(imdb_config);
        }
    });
});

router.get('/debug/:file', (req:Request, res:Response) =>
{
    const segmentPath = path.join(moviesDirPath, 'tt0111161', 'tmp', req.params.file);
    console.log(`Request: [${segmentPath}]`);

    if (!fs.existsSync(segmentPath)) {
        res.status(404).send('Segment not found');
    }

    res.setHeader('Content-Type', 'video/MP2T');
    res.sendFile(segmentPath);
});


export default router;