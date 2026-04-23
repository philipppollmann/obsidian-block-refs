import {
	ItemView,
	WorkspaceLeaf,
	MarkdownRenderer,
	setIcon,
	TFile,
} from "obsidian";
import type BlockRefsPlugin from "../main";
import { extractBlockRefs, FileBlockRefs } from "./blockExtractor";

export const VIEW_TYPE_BLOCK_REFS = "block-refs-view";

export class BlockRefsView extends ItemView {
	plugin: BlockRefsPlugin;
	currentTag: string | null = null;
	private renderTimer: number | null = null;
	private refsCollapsed = false;

	constructor(leaf: WorkspaceLeaf, plugin: BlockRefsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_BLOCK_REFS;
	}

	getDisplayText(): string {
		return this.currentTag
			? `${this.currentTag.replace(/^#/, "")}`
			: "Block References";
	}

	getIcon(): string {
		return "hash";
	}

	async onOpen(): Promise<void> {
		this.contentEl.addClass("block-refs-container");

		// Live-update when any file's metadata changes
		this.registerEvent(
			this.app.metadataCache.on("changed", () => {
				if (this.currentTag) {
					this.scheduleRender();
				}
			})
		);

		this.renderEmpty();
	}

	async setTag(tag: string): Promise<void> {
		this.currentTag = tag;
		this.refsCollapsed = false;

		// Update the leaf header/title
		const leaf = this.leaf as WorkspaceLeaf & {
			updateHeader?: () => void;
		};
		leaf.updateHeader?.();

		await this.renderBlocks();
	}

	private scheduleRender(): void {
		if (this.renderTimer !== null) {
			window.clearTimeout(this.renderTimer);
		}
		this.renderTimer = window.setTimeout(() => {
			this.renderBlocks();
			this.renderTimer = null;
		}, 300);
	}

	private renderEmpty(): void {
		const container = this.contentEl;
		container.empty();

		const emptyEl = container.createDiv({ cls: "block-refs-empty" });
		emptyEl.createEl("p", {
			text: "Click a #tag to see its block references.",
		});
	}

	private async renderBlocks(): Promise<void> {
		const container = this.contentEl;
		container.empty();

		if (!this.currentTag) {
			this.renderEmpty();
			return;
		}

		const pageEl = container.createDiv({ cls: "block-refs-page" });

		// Page title (tag name without #)
		const tagName = this.currentTag.replace(/^#/, "");
		pageEl.createEl("h1", {
			text: tagName,
			cls: "block-refs-page-title",
		});

		// Render matching page content if a file with the tag name exists
		await this.renderPageContent(pageEl, tagName);

		const results = await extractBlockRefs(this.app, this.currentTag);

		// Count total blocks
		let totalBlocks = 0;
		for (const fileRefs of results) {
			totalBlocks += fileRefs.blocks.length;
		}

		// Linked References section
		const refsSection = pageEl.createDiv({ cls: "block-refs-section" });

		const refsHeader = refsSection.createDiv({
			cls: "block-refs-section-header",
		});

		const toggleIcon = refsHeader.createSpan({
			cls: "block-refs-toggle-icon",
		});
		setIcon(toggleIcon, this.refsCollapsed ? "chevron-right" : "chevron-down");

		refsHeader.createSpan({
			text: `${totalBlocks} Linked Reference${totalBlocks !== 1 ? "s" : ""}`,
			cls: "block-refs-section-title",
		});

		const refsContent = refsSection.createDiv({
			cls: "block-refs-section-content",
		});

		if (this.refsCollapsed) {
			refsContent.style.display = "none";
		}

		refsHeader.addEventListener("click", () => {
			this.refsCollapsed = !this.refsCollapsed;
			setIcon(
				toggleIcon,
				this.refsCollapsed ? "chevron-right" : "chevron-down"
			);
			refsContent.style.display = this.refsCollapsed ? "none" : "";
		});

		if (results.length === 0) {
			refsContent.createDiv({
				cls: "block-refs-empty-inline",
				text: "No references found.",
			});
			return;
		}

		// Render file groups
		for (const fileRefs of results) {
			await this.renderFileGroup(refsContent, fileRefs);
		}
	}

	/**
	 * If a markdown file matching the tag name exists, render its content
	 * above the linked references (like a Logseq page).
	 */
	private async renderPageContent(
		container: HTMLElement,
		tagName: string
	): Promise<void> {
		// Search for a file matching the tag name (case-insensitive)
		const allFiles = this.app.vault.getMarkdownFiles();
		const pageFile = allFiles.find(
			(f) => f.basename.toLowerCase() === tagName.toLowerCase()
		);

		if (!pageFile) return;

		const pageSection = container.createDiv({
			cls: "block-refs-page-content",
		});

		// Clickable file link header
		const pageHeader = pageSection.createDiv({
			cls: "block-refs-page-header",
		});
		const pageIcon = pageHeader.createSpan({
			cls: "block-refs-file-icon",
		});
		setIcon(pageIcon, "file-text");
		pageHeader.createSpan({
			text: pageFile.basename,
			cls: "block-refs-file-name",
		});
		pageHeader.addEventListener("click", () => {
			this.app.workspace.getLeaf(false).openFile(pageFile);
		});

		// Render page markdown
		const contentEl = pageSection.createDiv({
			cls: "block-refs-page-body",
		});
		const fileContent = await this.app.vault.cachedRead(pageFile);
		await MarkdownRenderer.render(
			this.app,
			fileContent,
			contentEl,
			pageFile.path,
			this
		);
	}

	private async renderFileGroup(
		container: HTMLElement,
		fileRefs: FileBlockRefs
	): Promise<void> {
		const groupEl = container.createDiv({ cls: "block-refs-group" });

		// File header
		const fileHeader = groupEl.createDiv({
			cls: "block-refs-file-header",
		});
		const fileIcon = fileHeader.createSpan({
			cls: "block-refs-file-icon",
		});
		setIcon(fileIcon, "file-text");
		fileHeader.createSpan({
			text: fileRefs.file.basename,
			cls: "block-refs-file-name",
		});
		fileHeader.addEventListener("click", () => {
			this.app.workspace.getLeaf(false).openFile(fileRefs.file);
		});

		// Blocks
		for (const block of fileRefs.blocks) {
			const blockEl = groupEl.createDiv({ cls: "block-refs-block" });

			// Parent heading context
			if (
				block.parentHeading &&
				this.plugin.settings.showParentHeading
			) {
				const headingCtx = blockEl.createDiv({
					cls: "block-refs-heading-context",
				});
				const headingIcon = headingCtx.createSpan({
					cls: "block-refs-heading-icon",
				});
				setIcon(headingIcon, "heading");
				headingCtx.createSpan({ text: block.parentHeading });
			}

			// Rendered markdown content
			const contentEl = blockEl.createDiv({
				cls: "block-refs-content",
			});
			await MarkdownRenderer.render(
				this.app,
				block.content,
				contentEl,
				fileRefs.file.path,
				this
			);

			// Click to navigate to source
			blockEl.addEventListener("click", (evt) => {
				const clickTarget = evt.target as HTMLElement;
				if (clickTarget.closest("a") || clickTarget.closest(".tag")) {
					return;
				}
				this.app.workspace.getLeaf(false).openFile(fileRefs.file, {
					eState: { line: block.lineStart },
				});
			});
		}
	}

	async onClose(): Promise<void> {
		if (this.renderTimer !== null) {
			window.clearTimeout(this.renderTimer);
		}
		this.contentEl.empty();
	}
}
