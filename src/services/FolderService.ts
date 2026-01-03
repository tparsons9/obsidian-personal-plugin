import {App, TFile, TFolder} from 'obsidian';
import {isSubfolderOf, normalizeFolderPath} from '../utils/pathUtils';

/**
 * Service for folder operations and suggestions
 */
export class FolderService {
	constructor(private app: App) {}

	/**
	 * Get all folders in the vault
	 */
	getAllFolders(): TFolder[] {
		const folders: TFolder[] = [];
		const rootFolder = this.app.vault.getRoot();

		const collectFolders = (folder: TFolder) => {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					folders.push(child);
					collectFolders(child);
				}
			}
		};

		collectFolders(rootFolder);
		return folders;
	}

	/**
	 * Get folder suggestions for the move prompt
	 * Excludes watched folders and excluded folders (including subfolders)
	 */
	getSuggestions(
		watchedFolders: string[],
		excludedFolders: string[]
	): TFolder[] {
		const allFolders = this.getAllFolders();

		return allFolders.filter(folder => {
			const path = folder.path;

			// Exclude watched folders
			for (const watched of watchedFolders) {
				if (isSubfolderOf(path, normalizeFolderPath(watched))) {
					return false;
				}
			}

			// Exclude excluded folders and their subfolders
			for (const excluded of excludedFolders) {
				if (isSubfolderOf(path, normalizeFolderPath(excluded))) {
					return false;
				}
			}

			return true;
		});
	}

	/**
	 * Get a folder by path, or null if it doesn't exist
	 */
	getFolder(path: string): TFolder | null {
		const normalized = normalizeFolderPath(path);
		const abstract = this.app.vault.getAbstractFileByPath(normalized);
		return abstract instanceof TFolder ? abstract : null;
	}

	/**
	 * Ensure a folder exists, creating it if necessary
	 */
	async ensureFolder(path: string): Promise<TFolder> {
		const normalized = normalizeFolderPath(path);
		const existing = this.getFolder(normalized);
		if (existing) {
			return existing;
		}

		await this.app.vault.createFolder(normalized);
		const created = this.getFolder(normalized);
		if (!created) {
			throw new Error(`Failed to create folder: ${normalized}`);
		}
		return created;
	}

	/**
	 * Move a file to a destination folder
	 * Uses fileManager.renameFile to update links
	 * Note: After this call, file.path will be updated to the new location
	 */
	async moveFile(file: TFile, destinationFolder: TFolder): Promise<void> {
		const newPath = `${destinationFolder.path}/${file.name}`;
		await this.app.fileManager.renameFile(file, newPath);
	}

	/**
	 * Move a file to system trash (respects user's deletion preference)
	 */
	async trashFile(file: TFile): Promise<void> {
		await this.app.fileManager.trashFile(file);
	}
}
