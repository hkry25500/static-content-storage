"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirectories = getDirectories;
const fs_extra_1 = __importDefault(require("fs-extra"));
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
