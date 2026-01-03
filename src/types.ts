import {TFile} from 'obsidian';

/** Actionable stage values that trigger filing prompts */
export type StageValue = 'done' | 'archive' | 'delete';

/** All recognized stage values */
export const STAGE_VALUES: readonly StageValue[] = ['done', 'archive', 'delete'] as const;

/** A note with an actionable stage that needs processing */
export interface ActionableNote {
	file: TFile;
	stage: StageValue;
	/** Previous stage value before actionable stage was set, or null if none */
	previousStage: string | null;
}

/** Check if a value is an actionable stage */
export function isActionableStage(value: unknown): value is StageValue {
	return typeof value === 'string' && STAGE_VALUES.includes(value as StageValue);
}
