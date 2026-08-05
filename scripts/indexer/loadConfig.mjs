import { readFile } from 'node:fs/promises';

export async function loadConfigFromArgv() {
  const idx = process.argv.indexOf('--config');
  if (idx !== -1 && process.argv[idx + 1]) {
    try {
      const raw = await readFile(process.argv[idx + 1], 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read config file:', err.message);
      return {};
    }
  }
  return {};
}

export async function loadCitiesFile(citiesFile) {
  try {
    const raw = await readFile(citiesFile, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.map(({ name, lat, lng, country }) => ({ name, lat, lng, country }));
  } catch (error) {
    console.error(`Failed to read cities.json: ${error.message}`);
    return [];
  }
}
