/** Settings for the stage-based note filing feature */
export interface StageFilingSettings {
	/** Folders to watch for stage changes */
	watchedFolders: string[];
	/** Folder where archived notes are moved */
	archiveFolder: string;
	/** Folders excluded from destination suggestions (includes subfolders) */
	excludedFolders: string[];
}

export const DEFAULT_STAGE_FILING_SETTINGS: StageFilingSettings = {
	watchedFolders: ['clippings', 'inbox'],
	archiveFolder: 'bin',
	excludedFolders: []
};
