/**
 * Normalize a folder path by removing leading/trailing slashes
 */
export function normalizeFolderPath(path: string): string {
	return path.replace(/^\/+|\/+$/g, '');
}

/**
 * Check if a path is a subfolder of a parent path
 * @param child - The potential child path
 * @param parent - The potential parent path
 * @returns true if child is inside parent (or is parent itself)
 */
export function isSubfolderOf(child: string, parent: string): boolean {
	const normalizedChild = normalizeFolderPath(child);
	const normalizedParent = normalizeFolderPath(parent);

	if (normalizedChild === normalizedParent) {
		return true;
	}

	return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Check if a file path is inside any of the given folders
 */
export function isInFolders(filePath: string, folders: string[]): boolean {
	const normalizedFilePath = normalizeFolderPath(filePath);
	return folders.some(folder => {
		const normalizedFolder = normalizeFolderPath(folder);
		return normalizedFilePath.startsWith(normalizedFolder + '/') ||
			normalizedFilePath === normalizedFolder;
	});
}

/**
 * Get the parent folder path from a file path
 */
export function getParentFolder(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	return lastSlash === -1 ? '' : filePath.substring(0, lastSlash);
}
