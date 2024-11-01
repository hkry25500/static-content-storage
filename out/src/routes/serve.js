"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const fs_extra_2 = __importDefault(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("../utils");
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const router = (0, express_1.Router)();
const folderPath = process.env.CONTENT_FOLDER_PATH || path_1.default.join((0, os_1.homedir)(), './static');
const moviesDirPath = path_1.default.join(folderPath, './movies');
fluent_ffmpeg_1.default.setFfmpegPath(process.env.FFMPEG_EXECUTABLE_PATH);
(0, fs_extra_1.ensureDirSync)(path_1.default.join(folderPath, './movies'));
router.get('/movies', (_req, res) => {
    const movieDirs = (0, utils_1.getDirectories)(moviesDirPath);
    const movies = [];
    for (const imdbID of movieDirs) {
        const movieDirPath = path_1.default.join(moviesDirPath, imdbID);
        try {
            const imdb_config = fs_extra_2.default.readJSONSync(path_1.default.join(movieDirPath, 'imdb.config.json'));
            // 替换 imdb 配置文件中的 相对路径 到 完整请求路径
            imdb_config.sources.internal.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/source`;
            if (imdb_config.poster.source === 'internal') {
                imdb_config.poster.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/poster`;
            }
            delete imdb_config.poster.source;
            movies.push(imdb_config);
        }
        catch (error) {
            return console.error('Invalid configuration detected:', error);
        }
    }
    res.json(movies);
});
router.get('/movie/:imdbid/:prop?', (req, res) => {
    const imdbID = req.params.imdbid;
    const prop = req.params.prop;
    const movieDirPath = path_1.default.join(moviesDirPath, imdbID);
    // 使用 fs-extra 的 readJson 读取并解析 JSON 文件
    fs_extra_2.default.readJson(path_1.default.join(movieDirPath, 'imdb.config.json'), (err, imdb_config) => {
        if (err) {
            return console.error('Invalid configuration detected:', err);
        }
        if (prop) {
            switch (prop) {
                case 'source':
                    {
                        const from = req.query.from;
                        if (from === 'internal') {
                            const internalSourcePath = imdb_config.sources.internal.url;
                            if (internalSourcePath) {
                                return res.sendFile(path_1.default.join(movieDirPath, internalSourcePath));
                            }
                        }
                        else if (from === 'external') {
                            const externalSourcePath = imdb_config.sources.external.url;
                            if (externalSourcePath) {
                                // TODO: 为外部视频源提供反向代理
                                axios_1.default.get(externalSourcePath, { responseType: 'stream' })
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
                        else {
                            return res.status(500).send('Bad Request');
                        }
                    }
                    break;
                case 'stream':
                    {
                        const from = req.query.from;
                        if (from === 'internal') {
                            const internalSourcePath = imdb_config.sources.internal.url;
                            if (internalSourcePath) {
                                const filePath = path_1.default.join(movieDirPath, internalSourcePath);
                                const resolution = req.query.quality || '480p';
                                let size;
                                switch (resolution) {
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
                                const outputDir = path_1.default.join(movieDirPath, '/tmp');
                                const outputFilePath = path_1.default.join(outputDir, './output.m3u8');
                                const isTemped = fs_extra_2.default.existsSync(outputDir);
                                if (isTemped) {
                                    return res.sendFile(outputFilePath);
                                }
                                res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
                                // 使用 FFmpeg 转换为 HLS
                                (0, fluent_ffmpeg_1.default)(filePath)
                                    .outputOptions([
                                    '-preset veryfast',
                                    '-g 48',
                                    '-sc_threshold 0',
                                    '-map 0',
                                    '-f hls',
                                    '-hls_time 10',
                                    '-hls_list_size 0',
                                    '-hls_segment_filename', path_1.default.join(outputDir, 'segment_%03d.ts')
                                ])
                                    .output(outputFilePath)
                                    .on('end', () => {
                                    res.sendFile(outputFilePath);
                                })
                                    .on('error', (err) => {
                                    console.error('Error:', err.message);
                                    res.status(500).send('Error processing video');
                                })
                                    .run();
                                // res.setHeader('Content-Type', 'video/mp4');
                                // 捕获所有异常，防止崩溃
                                // res.on('close', () => {
                                //     console.log('Response stream closed, aborting ffmpeg processing.');
                                //     command.kill('SIGKILL'); // 强制中止 ffmpeg 进程
                                // });
                                // const command = ffmpeg(filePath)
                                //     .size(size)
                                //     .on('start', (commandLine) => {
                                //         console.log('Spawned FFmpeg with command: ' + commandLine);
                                //     })
                                //     .on('error', (err) => {
                                //         console.error('Error during processing:', err.message);
                                //         if (!res.headersSent) {
                                //             res.status(500).send('Error processing video');
                                //         }
                                //     })
                                //     .on('end', () => {
                                //         console.log('Processing finished successfully');
                                //         res.end(); // 确保响应正确关闭
                                //     })
                                //     .format('mp4')
                                //     .outputOptions([
                                //         '-movflags frag_keyframe+empty_moov',
                                //         '-max_muxing_queue_size', '1024',
                                //         '-bufsize', '1000k',
                                //         '-preset', 'ultrafast',
                                //         '-tune', 'zerolatency'
                                //     ]);
                                // command.pipe(res, { end: true });
                            }
                        }
                        else if (from === 'external') {
                            return res.status(501).send();
                        }
                        else {
                            return res.status(502).send();
                        }
                    }
                    break;
                case 'poster':
                    {
                        const poster = imdb_config.poster;
                        if (poster.source === 'internal') {
                            return res.sendFile(path_1.default.join(movieDirPath, poster.url));
                        }
                        else if (poster.source === 'external') {
                            axios_1.default.get(poster.url, { responseType: 'stream' })
                                .then(response => response.data.pipe(res))
                                .catch(__error => res.status(500).send());
                        }
                    }
                    break;
            }
        }
        else {
            imdb_config.sources.internal.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/source`;
            if (imdb_config.poster.source === 'internal') {
                imdb_config.poster.url = `http://${process.env.HOST_ADDR}:${process.env.HOST_PORT}/static/movie/${imdbID}/poster`;
            }
            delete imdb_config.poster.source;
            return res.json(imdb_config);
        }
    });
});
// const categories: string[] = getDirectories(folderDirname);
// if (categories.length > 0)
// {
//     for (const item of categories)
//     {
//         router.get(`/${item}/:filename`, (req, res) => {
//             const filePath = path.join(folderDirname, item, req.params.filename);
//             res.sendFile(filePath);
//         })
//     }
// }
exports.default = router;
