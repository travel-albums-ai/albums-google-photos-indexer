const CELL_SIZE = 1

/**
 * Build a grid map of cities grouped by lat/lng cell.
 * Skips invalid coordinates and normalizes city names by removing
 * common suffixes case-insensitively.
 */
export function buildCitiesGridCleaned(cities, cellSize = CELL_SIZE) {
  if (!Array.isArray(cities) || !cities.length) return new Map()

  const grid = new Map()
  const suffixRe = /\b(?:city|town|village)\b\s*$/i

  for (let i = 0; i < cities.length; i++) {
    const c = cities[i]
    if (!c) continue

    const lat = Number(c.lat)
    const lng = Number(c.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

    const name = (c.name || '').toString()
    const cleanedName = name.replace(suffixRe, '').trim()

    const entry = { ...c, name: cleanedName }
    const key = `${Math.floor(lat / cellSize)}:${Math.floor(lng / cellSize)}`
    const existing = grid.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      grid.set(key, [entry])
    }
  }

  return grid
}
