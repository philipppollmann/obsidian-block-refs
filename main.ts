import { Notice, Plugin, SuggestModal, WorkspaceLeaf } from "obsidian";
import { BlockRefsView, VIEW_TYPE_BLOCK_REFS } from "./src/view";
import {
	BlockRefsSettingTab,
	BlockRefsSettings,
	DEFAULT_SETTINGS,
} from "./src/settings";
import { registerTagClickHandler } from "./src/tagClickHandler";

export default class BlockRefsPlugin extends Plugin {
	settings: BlockRefsSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_BLOCK_REFS,
			(leaf) => new BlockRefsView(leaf, this)
		);

		registerTagClickHandler(this);

		this.addSettingTab(new BlockRefsSettingTab(this.app, this));

		this.addCommand({
			id: "open-block-refs",
			name: "Search tag references",
			callback: () => {
				new TagSuggestModal(this).open();
			},
		});

		console.log("Block References plugin loaded");
		new Notice("Block References plugin loaded");
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async activateView(tag: string): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_BLOCK_REFS);

		if (leaves.length > 0) {
			// Reuse existing view
			leaf = leaves[0];
		} else {
			// Open as a new tab in the main editor area
			leaf = workspace.getLeaf(true);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_BLOCK_REFS,
					active: true,
				});
			}
		}

		if (leaf) {
			const view = leaf.view as BlockRefsView;
			await view.setTag(tag);
			workspace.revealLeaf(leaf);
		}
	}
}

class TagSuggestModal extends SuggestModal<string> {
	plugin: BlockRefsPlugin;

	constructor(plugin: BlockRefsPlugin) {
		super(plugin.app);
		this.plugin = plugin;
		this.setPlaceholder("Type a tag name...");
	}

	getSuggestions(query: string): string[] {
		const tagSet = new Set<string>();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.tags) continue;
			for (const tag of cache.tags) {
				tagSet.add(tag.tag);
			}
		}

		const allTags = Array.from(tagSet).sort();

		if (!query) return allTags;

		const q = query.toLowerCase();
		return allTags.filter((tag) => tag.toLowerCase().includes(q));
	}

	renderSuggestion(tag: string, el: HTMLElement): void {
		el.createEl("span", { text: tag });
	}

	onChooseSuggestion(tag: string): void {
		this.plugin.activateView(tag);
	}
}
