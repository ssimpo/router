import {makeArray} from "./array";
import {sep} from "path";
import fs from "fs";
import {resolve} from "path";
import flattenDeep from "lodash/flattenDeep";
import uniq from "lodash/uniq";
import _glob from "glob";
import {promisify} from "util";

const glob = promisify(_glob);


export async function getDirectories(paths) {
	const _paths = makeArray(paths);

	const dirs = await Promise.all(_paths.map(async (dirPath)=>{
		const files = await fs.promises.readdir(dirPath);
		const dirs = await Promise.all(files.filter(async (fileName)=>{
			const stat = await fs.promises.stat(`${dirPath}${sep}${fileName}`);
			return stat.isDirectory();
		}));

		return dirs.map(dirName=>resolve(`${dirPath}${sep}${dirName}`));
	}));

	return flattenDeep(dirs);
}

export async function getFiles(paths=[], filters=[]) {
	const _paths = makeArray(paths);
	const _filters = makeArray(filters);

	const files = await Promise.all(_paths.map(async (path)=>{
		const matches = uniq(flattenDeep(await Promise.all(
			_filters.map(filter=>glob(`${path}/${filter}`, {}))
		)));

		return Promise.all(matches.filter(async (filePath)=>{
			const stat = await fs.promises.stat(filePath);
			return stat.isFile();
		}));
	}));

	return flattenDeep(files);
}