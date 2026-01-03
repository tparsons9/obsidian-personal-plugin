import {App, Modal} from 'obsidian';

/**
 * A confirmation modal for archive/delete actions
 */
export class ConfirmModal extends Modal {
	private resolve: ((confirmed: boolean) => void) | null = null;
	private resolved = false;

	constructor(
		app: App,
		private title: string,
		private message: string,
		private isDestructive: boolean,
		private confirmText = 'Confirm',
		private cancelText = 'Cancel'
	) {
		super(app);
	}

	/**
	 * Open the modal and return a promise that resolves to true if confirmed
	 */
	openAndWait(): Promise<boolean> {
		return new Promise((resolve) => {
			this.resolve = resolve;
			this.open();
		});
	}

	onOpen(): void {
		const {contentEl} = this;

		contentEl.createEl('h2', {text: this.title});
		contentEl.createEl('p', {text: this.message});

		const buttonContainer = contentEl.createDiv({cls: 'modal-button-container'});

		const cancelBtn = buttonContainer.createEl('button', {text: this.cancelText});
		cancelBtn.addEventListener('click', () => {
			this.resolveAndClose(false);
		});

		const confirmBtn = buttonContainer.createEl('button', {
			text: this.confirmText,
			cls: this.isDestructive ? 'mod-warning' : 'mod-cta'
		});
		confirmBtn.addEventListener('click', () => {
			this.resolveAndClose(true);
		});
	}

	onClose(): void {
		const {contentEl} = this;
		contentEl.empty();

		// If closed without explicit choice, treat as cancel
		if (!this.resolved && this.resolve) {
			this.resolve(false);
		}
	}

	private resolveAndClose(confirmed: boolean): void {
		this.resolved = true;
		if (this.resolve) {
			this.resolve(confirmed);
		}
		this.close();
	}
}
