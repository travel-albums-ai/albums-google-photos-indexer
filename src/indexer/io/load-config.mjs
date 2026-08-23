import { readFile } from 'node:fs/promises';

export function configPathFromArgv(argv = process.argv) {
  const idx = argv.indexOf('--config');
  return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : 'server-config.json';
}

export async function loadConfigFromArgv() {
  const configPath = configPathFromArgv();
  if (configPath) {
    try {
      const raw = await readFile(configPath, 'utf8');
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
    const raw = typeof Bun !== 'undefined'
      ? await Bun.file(citiesFile).text()
      : await readFile(citiesFile, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.map(({ name, lat, lng, country }) => ({ name, lat, lng, country }));
  } catch (error) {
    console.error(`Failed to read cities.json: ${error.message}`);
    return [];
  }
}
