import { App, CachedMetadata, TFile, TagCache, SectionCache } from "obsidian";

export interface BlockRef {
	file: TFile;
	parentHeading: string | null;
	parentHeadingLine: number | null;
	content: string;
	lineStart: number;
	lineEnd: number;
}

export interface FileBlockRefs {
	file: TFile;
	blocks: BlockRef[];
}

/**
 * Find all blocks across the vault that contain the given tag.
 * Uses MetadataCache for tag positions and section boundaries.
 */
export async function extractBlockRefs(
	app: App,
	tag: string
): Promise<FileBlockRefs[]> {
	const results: FileBlockRefs[] = [];
	const files = app.vault.getMarkdownFiles();

	// Normalize: ensure tag starts with #
	const normalizedTag = tag.startsWith("#") ? tag : `#${tag}`;

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache?.tags) continue;

		const matchingTags = cache.tags.filter(
			(t) => t.tag.toLowerCase() === normalizedTag.toLowerCase()
		);
		if (matchingTags.length === 0) continue;

		const content = await app.vault.cachedRead(file);
		const lines = content.split("\n");

		const blocks: BlockRef[] = [];

		for (const tagCache of matchingTags) {
			const block = buildBlock(file, cache, tagCache, lines);
			if (block) blocks.push(block);
		}

		// Deduplicate blocks that fall in the same section
		const deduped = deduplicateBlocks(blocks);

		if (deduped.length > 0) {
			results.push({ file, blocks: deduped });
		}
	}

	// Sort by file name
	results.sort((a, b) => a.file.basename.localeCompare(b.file.basename));

	return results;
}

function buildBlock(
	file: TFile,
	cache: CachedMetadata,
	tagCache: TagCache,
	lines: string[]
): BlockRef | null {
	const tagLine = tagCache.position.start.line;

	// Find section containing this tag
	let lineStart = tagLine;
	let lineEnd = tagLine;

	if (cache.sections) {
		const section = findContainingSection(cache.sections, tagLine);
		if (section) {
			lineStart = section.position.start.line;
			lineEnd = section.position.end.line;
		}
	}

	// Fallback: expand to paragraph boundaries (blank lines)
	if (lineStart === lineEnd) {
		lineStart = tagLine;
		while (lineStart > 0 && lines[lineStart - 1]?.trim() !== "") {
			lineStart--;
		}
		lineEnd = tagLine;
		while (
			lineEnd < lines.length - 1 &&
			lines[lineEnd + 1]?.trim() !== ""
		) {
			lineEnd++;
		}
	}

	// Extract content
	const blockLines = lines.slice(lineStart, lineEnd + 1);
	const content = blockLines.join("\n");

	// Find nearest parent heading above the block
	let parentHeading: string | null = null;
	let parentHeadingLine: number | null = null;

	if (cache.headings) {
		for (const heading of cache.headings) {
			if (heading.position.start.line < lineStart) {
				parentHeading = heading.heading;
				parentHeadingLine = heading.position.start.line;
			} else {
				break;
			}
		}
	}

	return {
		file,
		parentHeading,
		parentHeadingLine,
		content,
		lineStart,
		lineEnd,
	};
}

function findContainingSection(
	sections: SectionCache[],
	line: number
): SectionCache | null {
	for (const section of sections) {
		if (
			section.position.start.line <= line &&
			section.position.end.line >= line
		) {
			return section;
		}
	}
	return null;
}

/**
 * Remove duplicate blocks that cover the same line range
 * (e.g. multiple tags in the same paragraph).
 */
function deduplicateBlocks(blocks: BlockRef[]): BlockRef[] {
	const seen = new Set<string>();
	return blocks.filter((block) => {
		const key = `${block.lineStart}-${block.lineEnd}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
