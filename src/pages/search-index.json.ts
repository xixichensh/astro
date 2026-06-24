import { getCollection } from 'astro:content';

export const prerender = true;

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

const stripMarkdown = (markdown: string) =>
	markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/[*_~>#-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

export async function GET() {
	const posts = (await getCollection('blog'))
		.filter((post) => !post.data.draft)
		.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
		.map((post) => {
			const content = stripMarkdown(post.body ?? '');

			return {
				id: post.id,
				title: post.data.title,
				description: post.data.description,
				pubDate: post.data.pubDate.toISOString(),
				tags: post.data.tags,
				url: `${base}/blog/${post.id}/`,
				content,
				excerpt: content.slice(0, 180),
			};
		});

	return new Response(JSON.stringify(posts), {
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'public, max-age=300',
		},
	});
}
