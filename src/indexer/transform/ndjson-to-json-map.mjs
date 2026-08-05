import { SEPARATOR } from '../indexer.mjs';

function cellKey(latCell, lonCell) {
  return `${latCell}:${lonCell}`;
}

function findNearestCity(
  lat,
  lon,
  baseLat,
  baseLon,
  citiesGrid
) {
  let nearest = null;
  let minDistSq = Infinity;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const candidates = citiesGrid.get(cellKey(baseLat + dy, baseLon + dx));
      if (!candidates) continue;

      for (let i = 0; i < candidates.length; i++) {
        const a = candidates[i];

        const dLat = a.lat - lat;
        const dLon = a.lng - lon;
        const distSq = dLat * dLat + dLon * dLon;

        if (distSq < minDistSq) {
          minDistSq = distSq;
          nearest = a;
        }
      }
    }
  }

  return { city: nearest.name, country: nearest.country};
}

export const convertJSON = (obj, citiesGrid) => {
  const { data, relativePath, type, path, name, ...rest } = obj;
  const folder = relativePath

  const {
    geoDataExif,
    geoData,
    googlePhotosOrigin,
    appSource,
    description,
    creationTime,
    url,
    title,
    sharedAlbumComments,
    photoTakenTime,
    imageViews,
    people,
    archived,
    ...restData
  } = data;

  const result = {
    ...rest,
    ...restData,
    ...photoTakenTime,
    id: data.title,
    ...(people && { people: people.map(p => p.name) }),
    ...(imageViews !== 0 && { views: Number(imageViews) }),
    ...(geoData.latitude !== 0 && { latitude: geoData.latitude }),
    ...(geoData.longitude !== 0 && { longitude: geoData.longitude }),
    ...(geoData.latitude !== 0 &&
      geoData.longitude !== 0 && {
        ...findNearestCity(
          geoData.latitude,
          geoData.longitude,
          Math.floor(geoData.latitude),
          Math.floor(geoData.longitude),
          citiesGrid
        ),
      }),
    folder,
    social: sharedAlbumComments,
  }


  return { [obj.rootIndex + SEPARATOR + folder + SEPARATOR + data.title]: result, result, folder, id: [obj.rootIndex + SEPARATOR + folder + SEPARATOR + data.title] }
}
