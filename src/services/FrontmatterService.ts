import {App, TFile} from 'obsidian';

/**
 * Service for reading and writing frontmatter stage values
 */
export class FrontmatterService {
	constructor(private app: App) {}

	/**
	 * Get the stage value from a file's frontmatter
	 * @returns The stage value, or undefined if not set
	 */
	getStage(file: TFile): string | undefined {
		const cache = this.app.metadataCache.getFileCache(file);
		const stage: unknown = cache?.frontmatter?.stage;
		return typeof stage === 'string' ? stage : undefined;
	}

	/**
	 * Set the stage value in a file's frontmatter
	 */
	async setStage(file: TFile, stage: string): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm.stage = stage;
		});
	}

	/**
	 * Remove the stage property from a file's frontmatter
	 */
	async removeStage(file: TFile): Promise<void> {
		await this.app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			delete fm.stage;
		});
	}
}
