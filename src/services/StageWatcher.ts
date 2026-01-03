import {App, CachedMetadata, TFile} from 'obsidian';
import {ActionableNote, isActionableStage} from '../types';
import {StageFilingSettings} from '../settings/types';
import {FrontmatterService} from './FrontmatterService';
import {FolderService} from './FolderService';
import {ConfirmModal} from '../modals/ConfirmModal';
import {FolderSuggestModal} from '../modals/FolderSuggestModal';
import {isInFolders} from '../utils/pathUtils';

/**
 * Core service that watches for stage changes and handles filing actions
 */
export class StageWatcher {
	private frontmatterService: FrontmatterService;
	private folderService: FolderService;

	/**
	 * Tracks the last known stage value for each file in watched folders.
	 * This allows us to know what the stage was BEFORE it became actionable.
	 */
	private stageCache: Map<string, string | undefined> = new Map();

	/** Queue of notes pending action */
	private actionQueue: ActionableNote[] = [];

	/** Whether we're currently processing the queue */
	private isProcessing = false;

	constructor(
		private app: App,
		private settings: StageFilingSettings
	) {
		this.frontmatterService = new FrontmatterService(app);
		this.folderService = new FolderService(app);
	}

	/**
	 * Handle a file change event from metadataCache
	 */
	onFileChanged(file: TFile, cache: CachedMetadata | null): void {
		// Only process markdown files
		if (file.extension !== 'md') {
			return;
		}

		// Check if file is in a watched folder
		if (!isInFolders(file.path, this.settings.watchedFolders)) {
			return;
		}

		// Get current stage from cache
		const currentStage: unknown = cache?.frontmatter?.stage;
		const currentStageStr = typeof currentStage === 'string' ? currentStage : undefined;

		// Get the previously known stage for this file
		const previousStage = this.stageCache.get(file.path);

		// Update our cache with the current stage
		this.stageCache.set(file.path, currentStageStr);

		// Check if it's an actionable stage
		if (!isActionableStage(currentStageStr)) {
			// Not actionable - nothing to do
			return;
		}

		// Already queued? Skip
		if (this.actionQueue.some(n => n.file.path === file.path)) {
			return;
		}

		// Add to queue with the previous stage value
		this.actionQueue.push({
			file,
			stage: currentStageStr,
			previousStage: previousStage ?? null
		});

		// Process queue
		void this.processQueue();
	}

	/**
	 * Scan all watched folders for notes with actionable stages
	 */
	async scanWatchedFolders(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			// Check if in watched folder
			if (!isInFolders(file.path, this.settings.watchedFolders)) {
				continue;
			}

			// Get stage
			const stage = this.frontmatterService.getStage(file);

			// Update cache
			this.stageCache.set(file.path, stage);

			if (!isActionableStage(stage)) {
				continue;
			}

			// Skip if already queued
			if (this.actionQueue.some(n => n.file.path === file.path)) {
				continue;
			}

			// For manual scan, we don't have previous stage info
			// Use null (will remove stage on cancel)
			this.actionQueue.push({
				file,
				stage,
				previousStage: null
			});
		}

		// Process queue
		void this.processQueue();
	}

	/**
	 * Process the action queue sequentially
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing) {
			return;
		}

		this.isProcessing = true;

		try {
			while (this.actionQueue.length > 0) {
				const note = this.actionQueue.shift()!;
				await this.handleNote(note);
			}
		} finally {
			this.isProcessing = false;
		}
	}

	/**
	 * Handle a single actionable note
	 */
	private async handleNote(note: ActionableNote): Promise<void> {
		// Verify file still exists
		const file = this.app.vault.getAbstractFileByPath(note.file.path);
		if (!(file instanceof TFile)) {
			this.stageCache.delete(note.file.path);
			return;
		}

		// Verify stage is still actionable
		const currentStage = this.frontmatterService.getStage(file);
		if (currentStage !== note.stage) {
			return;
		}

		switch (note.stage) {
			case 'done':
				await this.handleDone(file, note.previousStage);
				break;
			case 'archive':
				await this.handleArchive(file, note.previousStage);
				break;
			case 'delete':
				await this.handleDelete(file, note.previousStage);
				break;
		}
	}

	/**
	 * Handle 'done' stage - prompt for destination folder
	 */
	private async handleDone(file: TFile, previousStage: string | null): Promise<void> {
		const folders = this.folderService.getSuggestions(
			this.settings.watchedFolders,
			this.settings.excludedFolders
		);

		const modal = new FolderSuggestModal(this.app, folders, file.basename);
		const selectedFolder = await modal.openAndWait();

		if (!selectedFolder) {
			await this.revertStage(file, previousStage);
			return;
		}

		// Move file (file.path is updated after this)
		await this.folderService.moveFile(file, selectedFolder);

		// Remove stage from moved file
		await this.frontmatterService.removeStage(file);
	}

	/**
	 * Handle 'archive' stage - confirm and move to archive folder
	 */
	private async handleArchive(file: TFile, previousStage: string | null): Promise<void> {
		const modal = new ConfirmModal(
			this.app,
			'Archive note',
			`Move "${file.basename}" to archive folder (${this.settings.archiveFolder})?`,
			false,
			'Archive',
			'Cancel'
		);

		const confirmed = await modal.openAndWait();

		if (!confirmed) {
			await this.revertStage(file, previousStage);
			return;
		}

		// Ensure archive folder exists
		const archiveFolder = await this.folderService.ensureFolder(this.settings.archiveFolder);

		// Move file (file.path is updated after this)
		await this.folderService.moveFile(file, archiveFolder);

		// Remove stage from moved file
		await this.frontmatterService.removeStage(file);
	}

	/**
	 * Handle 'delete' stage - confirm and move to system trash
	 */
	private async handleDelete(file: TFile, previousStage: string | null): Promise<void> {
		const modal = new ConfirmModal(
			this.app,
			'Delete note',
			`Move "${file.basename}" to system trash? This action can be undone from your system's trash.`,
			true,
			'Delete',
			'Cancel'
		);

		const confirmed = await modal.openAndWait();

		if (!confirmed) {
			await this.revertStage(file, previousStage);
			return;
		}

		// Move to trash
		await this.folderService.trashFile(file);
	}

	/**
	 * Revert stage to previous value, or remove if no previous value
	 */
	private async revertStage(file: TFile, previousStage: string | null): Promise<void> {
		if (previousStage === null) {
			await this.frontmatterService.removeStage(file);
		} else {
			await this.frontmatterService.setStage(file, previousStage);
		}
		// Update cache with reverted value
		this.stageCache.set(file.path, previousStage ?? undefined);
	}

	/**
	 * Update the path in stageCache when a file is renamed
	 */
	renamePath(oldPath: string, newPath: string): void {
		const value = this.stageCache.get(oldPath);
		if (value !== undefined) {
			this.stageCache.delete(oldPath);
			this.stageCache.set(newPath, value);
		}
	}

	/**
	 * Clean up when a file is deleted
	 */
	onDelete(path: string): void {
		this.stageCache.delete(path);
	}
}
