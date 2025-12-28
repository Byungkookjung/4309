const storage = (function () {
	// Single key
	const STORAGE_KEY = 'myAppData';
	// Replace DEFAULT with nested ledger structure
	const DEFAULT = {
		schemaVersion: 1,
		todos: [],
		ledger: {
			initialBalance: 0,
			entries: [],
			plans: []
		}
	};

	function readRaw() {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		try { return JSON.parse(raw); } catch (e) { return null; }
	}

	function saveAll(obj) {
		const merged = { ...DEFAULT, ...obj };
		// ensure schemaVersion persists
		if (!merged.schemaVersion) merged.schemaVersion = DEFAULT.schemaVersion;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
	}

	function load() {
		let data = readRaw();
		if (!data) {
			migrateLegacy();
			data = readRaw() || { ...DEFAULT };
		}
		// ensure schema keys exist and normalize old flat keys if necessary
		// If someone still wrote flat keys in storage, normalize them now:
		if (data.ledger === undefined) {
			data.ledger = {
				initialBalance: data.ledgerInitialBalance || 0,
				entries: data.ledgerEntries || [],
				plans: data.planItems || []
			};
			// remove flat keys (optional): delete data.ledgerInitialBalance; delete data.ledgerEntries; delete data.planItems;
		}
		return { ...DEFAULT, ...data };
	}

	// get/set mapping for backward compatibility
	function get(key) {
		const d = load();
		switch (key) {
			case 'ledgerEntries':
				return d.ledger.entries;
			case 'planItems':
				return d.ledger.plans;
			case 'ledgerInitialBalance':
				return d.ledger.initialBalance;
			default:
				return d[key];
		}
	}

	function set(key, value) {
		const d = load();
		switch (key) {
			case 'ledgerEntries':
				d.ledger.entries = value;
				break;
			case 'planItems':
				d.ledger.plans = value;
				break;
			case 'ledgerInitialBalance':
				d.ledger.initialBalance = Number(value || 0);
				break;
			default:
				d[key] = value;
		}
		saveAll(d);
	}

	// Migrate legacy separate keys into nested myAppData. (fills DEFAULT.ledger.*)
	function migrateLegacy() {
		if (readRaw()) return;
		const legacyKeys = ['todos', 'ledgerEntries', 'planItems', 'ledgerInitialBalance'];
		let has = false;
		const data = { ...DEFAULT };
		legacyKeys.forEach(k => {
			const raw = localStorage.getItem(k);
			if (!raw) return;
			try {
				const parsed = JSON.parse(raw);
				if (k === 'ledgerInitialBalance') {
					data.ledger.initialBalance = Number(parsed || parsed === 0 ? parsed : 0) || 0;
				} else if (k === 'ledgerEntries') {
					data.ledger.entries = parsed || [];
				} else if (k === 'planItems') {
					data.ledger.plans = parsed || [];
				} else if (k === 'todos') {
					data.todos = parsed || [];
				}
				has = true;
			} catch (e) {
				// ignore malformed legacy item
			}
		});
		if (has) {
			saveAll(data);
			// optional: clear legacy keys if you want to avoid duplicates:
			// legacyKeys.forEach(k => localStorage.removeItem(k));
		}
	}

	return { load, get, set, saveAll, migrateLegacy };
})();
