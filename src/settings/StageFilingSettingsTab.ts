import {App, PluginSettingTab, Setting} from 'obsidian';
import type StageFilingPlugin from '../main';

/**
 * Settings tab for the stage-based note filing feature
 */
export class StageFilingSettingsTab extends PluginSettingTab {
	plugin: StageFilingPlugin;

	constructor(app: App, plugin: StageFilingPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Stage-based note filing')
			.setHeading();

		new Setting(containerEl)
			.setName('Watched folders')
			.setDesc('Folders to watch for stage changes (comma-separated)')
			.addText(text => text
				.setPlaceholder('Example: clippings, inbox')
				.setValue(this.plugin.settings.watchedFolders.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.watchedFolders = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Archive folder')
			.setDesc('Destination folder for archived notes')
			.addText(text => text
				.setPlaceholder('Example: bin')
				.setValue(this.plugin.settings.archiveFolder)
				.onChange(async (value) => {
					this.plugin.settings.archiveFolder = value.trim();
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc('Folders to exclude from destination suggestions (comma-separated, includes subfolders)')
			.addText(text => text
				.setPlaceholder('Example: templates')
				.setValue(this.plugin.settings.excludedFolders.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.excludedFolders = value
						.split(',')
						.map(s => s.trim())
						.filter(s => s.length > 0);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Stage values')
			.setHeading();

		new Setting(containerEl)
			.setName('Recognized stages')
			.setDesc('Use "done" to select a destination folder, "archive" to move to archive folder, or "delete" to move to trash.');
	}
}
