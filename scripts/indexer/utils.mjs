const CELL_SIZE = 1

export function buildCitiesGridCleaned(cities, cellSize = CELL_SIZE) {
  if (!cities?.length) return new Map()

  const grid = new Map()

  for (let i = 0; i < cities.length; i++) {
    const c = cities[i]
    const cleanedName = c.name
      .replace('City', '')
      .replace('Town', '')
      .replace('Village', '')
      .trim()

    const entry = { ...c, name: cleanedName }
    const key = `${Math.floor(c.lat / cellSize)}:${Math.floor(c.lng / cellSize)}`
    const existing = grid.get(key)
    if (existing) {
      existing.push(entry)
    } else {
      grid.set(key, [entry])
    }
  }

  return grid
}
