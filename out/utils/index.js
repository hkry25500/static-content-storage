"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectories = getDirectories;
exports.isStreamFileAvailable = isStreamFileAvailable;
const fs_extra_1 = __importStar(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function getDirectories(srcPath) {
    const items = fs_extra_1.default.readdirSync(srcPath);
    const directories = [];
    for (const item of items) {
        const itemPath = path_1.default.join(srcPath, item);
        const stats = fs_extra_1.default.statSync(itemPath);
        if (stats.isDirectory()) {
            directories.push(item);
        }
    }
    return directories;
}
function isStreamFileAvailable(filePath) {
    const isFileExisted = (0, fs_extra_1.existsSync)(filePath);
    if (!isFileExisted) {
        return false;
    }
    try {
        const data = fs_extra_1.default.readFileSync(filePath, 'utf8');
        if (data.includes('#EXT-X-ENDLIST')) {
            return true;
        }
        else {
            return false;
        }
    }
    catch (err) {
        console.error('Error reading file:', err);
        return false;
    }
}
