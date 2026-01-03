import {Plugin, TFile} from 'obsidian';
import {DEFAULT_STAGE_FILING_SETTINGS, StageFilingSettings} from './settings/types';
import {StageFilingSettingsTab} from './settings/StageFilingSettingsTab';
import {StageWatcher} from './services/StageWatcher';
import {registerCommands} from './commands';

export default class StageFilingPlugin extends Plugin {
	settings: StageFilingSettings;
	private stageWatcher: StageWatcher;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Initialize services
		this.stageWatcher = new StageWatcher(this.app, this.settings);

		// Register event listener for file changes
		this.registerEvent(
			this.app.metadataCache.on('changed', (file, data, cache) => {
				if (file instanceof TFile) {
					this.stageWatcher.onFileChanged(file, cache);
				}
			})
		);

		// Register event listener for file renames (to update path tracking)
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				this.stageWatcher.renamePath(oldPath, file.path);
			})
		);

		// Register event listener for file deletes (to clean up tracking)
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				this.stageWatcher.onDelete(file.path);
			})
		);

		// Register commands
		registerCommands(this, this.stageWatcher);

		// Register settings tab
		this.addSettingTab(new StageFilingSettingsTab(this.app, this));
	}

	onunload(): void {
		// Cleanup handled by this.register* helpers
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_STAGE_FILING_SETTINGS,
			await this.loadData() as Partial<StageFilingSettings>
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
