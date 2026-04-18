import { App, PluginSettingTab, Setting } from "obsidian";
import type BlockRefsPlugin from "../main";

export interface BlockRefsSettings {
	overrideTagClick: boolean;
	showParentHeading: boolean;
}

export const DEFAULT_SETTINGS: BlockRefsSettings = {
	overrideTagClick: true,
	showParentHeading: true,
};

export class BlockRefsSettingTab extends PluginSettingTab {
	plugin: BlockRefsPlugin;

	constructor(app: App, plugin: BlockRefsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Override tag click")
			.setDesc(
				"Clicking a tag opens the Block References view instead of the default search."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.overrideTagClick)
					.onChange(async (value) => {
						this.plugin.settings.overrideTagClick = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Show parent heading")
			.setDesc(
				"Display the nearest parent heading above each block for additional context."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showParentHeading)
					.onChange(async (value) => {
						this.plugin.settings.showParentHeading = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
