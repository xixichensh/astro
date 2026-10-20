import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const contentDir = path.resolve('src/content');
const problems = [];

async function walk(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(fullPath)));
		else if (/\.(md|mdx|astro)$/.test(entry.name)) files.push(fullPath);
	}
	return files;
}

function collect(text) {
	const links = [];
	for (const match of text.matchAll(/href="([^"]+)"/g)) links.push(match[1]);
	for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) links.push(match[1]);
	return links;
}

function problemFor(raw) {
	if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
		return null;
	}
	if (/\s/.test(raw) || /[\u3400-\u9fff]/.test(raw)) {
		return '网址里混入了空格或中文';
	}
	let url;
	try {
		url = new URL(raw);
	} catch {
		return '不是合法网址';
	}
	if (!['http:', 'https:'].includes(url.protocol)) return '只允许 http 或 https 外链';
	if (!/^[a-z0-9.-]+$/i.test(url.hostname)) return '域名格式不正确';
	return null;
}

for (const file of await walk(contentDir)) {
	const text = await readFile(file, 'utf8');
	for (const link of collect(text)) {
		const reason = problemFor(link);
		if (reason) problems.push(`${path.relative(process.cwd(), file)}: ${reason}: ${link}`);
	}
}

if (problems.length > 0) {
	console.error('外链格式检查未通过:');
	for (const problem of problems) console.error(`- ${problem}`);
	process.exit(1);
}

console.log('外链格式检查通过');
