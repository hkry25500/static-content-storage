import fs, { existsSync } from 'fs-extra'
import path from 'path';


export function getDirectories(srcPath: string)
{
    const items = fs.readdirSync(srcPath);
    const directories: string[] = [];
  
    for (const item of items) {
        const itemPath = path.join(srcPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
            directories.push(item);
        }
    }
  
    return directories;
}

export function isStreamFileAvailable(filePath: string): boolean
{
    const isFileExisted = existsSync(filePath);

    if (!isFileExisted)
    {
        return false;
    }

    try
    {
        const data = fs.readFileSync(filePath, 'utf8');
        
        if (data.includes('#EXT-X-ENDLIST')) {
            return true;
        } else {
            return false;
        }
    }
    catch(err)
    {
        console.error('Error reading file:', err);
        return false;
    }
}