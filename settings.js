
const SETTINGS_KEY = 'ims_settings';

const DEFAULT_SETTINGS = {
  appName: 'Inventory Portal',
  lowStockThreshold: 5,
  categories: ['Electronics', 'Furniture', 'Clothing', 'Food', 'Other']
};

function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    //will connect with defaults to ensure new fields exist
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(next) {
  const merged = { ...DEFAULT_SETTINGS, ...next };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
}

function updateSetting(key, value) {
  const cur = getSettings();
  cur[key] = value;
  saveSettings(cur);
}