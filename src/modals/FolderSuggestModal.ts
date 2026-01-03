import {App, SuggestModal, TFolder} from 'obsidian';

/**
 * A suggest modal for selecting a destination folder
 */
export class FolderSuggestModal extends SuggestModal<TFolder> {
	private resolve: ((folder: TFolder | null) => void) | null = null;
	private selectedFolder: TFolder | null = null;

	constructor(
		app: App,
		private folders: TFolder[],
		noteName: string
	) {
		super(app);
		this.setPlaceholder(`Select destination for "${noteName}"...`);
	}

	/**
	 * Open the modal and return a promise that resolves to the selected folder
	 * or null if cancelled
	 */
	openAndWait(): Promise<TFolder | null> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	getSuggestions(query: string): TFolder[] {
		const lowerQuery = query.toLowerCase();
		return this.folders.filter(folder =>
			folder.path.toLowerCase().includes(lowerQuery)
		);
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	onChooseSuggestion(item: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.selectedFolder = item;
	}

	onClose(): void {
		// Delay resolution to next tick to allow onChooseSuggestion to complete first
		// (onClose fires before onChooseSuggestion in SuggestModal)
		setTimeout(() => {
			if (this.resolve) {
				this.resolve(this.selectedFolder);
				this.resolve = null;
			}
		}, 0);
	}
}
