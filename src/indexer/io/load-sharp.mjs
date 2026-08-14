import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sharpModule = await import(pathToFileURL(
	path.join(process.cwd(), 'node_modules', 'sharp', 'dist', 'index.mjs'),
).href);

export default sharpModule.default;
