import {Plugin} from 'obsidian';
import {StageWatcher} from '../services/StageWatcher';

/**
 * Register all commands for the stage filing feature
 */
export function registerCommands(plugin: Plugin, stageWatcher: StageWatcher): void {
	plugin.addCommand({
		id: 'scan-watched-folders',
		name: 'Scan watched folders for actionable notes',
		callback: () => {
			void stageWatcher.scanWatchedFolders();
		}
	});
}
