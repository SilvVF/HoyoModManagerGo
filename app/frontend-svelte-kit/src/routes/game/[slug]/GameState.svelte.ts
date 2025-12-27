import type { DataApi } from '@/lib/data/dataapi';
import { zzzElementPref } from '@/lib/data/prefs';
import { types } from '@/lib/wailsjs/go/models';

interface FilterState {
	onlyCustom: boolean;
	query: string;
	availableOnly: boolean;
	filteredCharacters: types.CharacterWithModsAndTags[];
	selectedElements: string[];
	searchActive: boolean;

	setOnlyCustom: (custom: boolean) => void;
	setQuery: (query: string) => void;
	setAvailableOnly: (available: boolean) => void;
	toggleElementFilter: (element: string) => void;
	setSearchActive: (active: boolean) => void;
	toggleSearchActive: () => void;
}
