const EARTH_RADIUS_METERS = 6371000
const MAX_DISTANCE_METERS = 250
const MAX_TIME_GAP_MS = 4 * 60 * 60 * 1000
const MIN_POINTS = 2

function distanceMeters(first, second) {
  const radians = value => value * Math.PI / 180
  const latitudeDelta = radians(second.latitude - first.latitude)
  const longitudeDelta = radians(second.longitude - first.longitude)
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function validCoordinate(photo) {
  return Number.isFinite(photo.latitude)
    && Number.isFinite(photo.longitude)
    && Math.abs(photo.latitude) <= 90
    && Math.abs(photo.longitude) <= 180
    && photo.takenAt
    && Number.isFinite(new Date(photo.takenAt).getTime())
}

function nearby(first, second) {
  const timeDelta = Math.abs(new Date(first.takenAt).getTime() - new Date(second.takenAt).getTime())
  return timeDelta <= MAX_TIME_GAP_MS && distanceMeters(first, second) <= MAX_DISTANCE_METERS
}

export function findTripGroups(photos) {
  const points = photos.filter(validCoordinate)
  if (!points.length) return []

  let maxLatitude = 0
  points.forEach(point => {
    maxLatitude = Math.max(maxLatitude, Math.abs(point.latitude))
  })
  const longitudeScale = Math.cos(maxLatitude * Math.PI / 180)
  const latitudeCellSize = MAX_DISTANCE_METERS / 111320
  const longitudeCellSize = latitudeCellSize / longitudeScale
  const longitudeCellCount = Math.max(1, Math.ceil(360 / longitudeCellSize))
  const grid = new Map()
  const cellFor = point => {
    const longitude = ((point.longitude + 180) % 360 + 360) % 360
    return {
      latitude: Math.floor(point.latitude / latitudeCellSize),
      longitude: Math.floor(longitude / longitudeCellSize)
    }
  }
  points.forEach((point, index) => {
    const cell = cellFor(point)
    const key = `${cell.latitude}:${cell.longitude}`
    if (!grid.has(key)) grid.set(key, [])
    grid.get(key).push(index)
  })
  const neighborsFor = index => {
    const point = points[index]
    const cell = cellFor(point)
    const candidates = new Set()
    for (let latitude = cell.latitude - 2; latitude <= cell.latitude + 2; latitude += 1) {
      for (let longitude = cell.longitude - 2; longitude <= cell.longitude + 2; longitude += 1) {
        const wrappedLongitude = (longitude % longitudeCellCount + longitudeCellCount) % longitudeCellCount
        const bucket = grid.get(`${latitude}:${wrappedLongitude}`) || []
        bucket.forEach(candidateIndex => {
          if (nearby(point, points[candidateIndex])) candidates.add(candidateIndex)
        })
      }
    }
    return Array.from(candidates)
  }

  const visited = new Set()
  const groups = []

  for (let index = 0; index < points.length; index += 1) {
    if (visited.has(index)) continue
    visited.add(index)
    const neighbors = neighborsFor(index)
    if (neighbors.length < MIN_POINTS) continue

    const cluster = new Set(neighbors)
    const queue = neighbors.slice()
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const currentIndex = queue[cursor]
      if (!visited.has(currentIndex)) {
        visited.add(currentIndex)
        const moreNeighbors = neighborsFor(currentIndex)
        if (moreNeighbors.length >= MIN_POINTS) {
          moreNeighbors.forEach(candidateIndex => {
            if (!cluster.has(candidateIndex)) {
              cluster.add(candidateIndex)
              queue.push(candidateIndex)
            }
          })
        }
      }
    }
    const members = Array.from(cluster, clusterIndex => points[clusterIndex])
    const earliest = members
      .map(member => new Date(member.takenAt))
      .sort((a, b) => a - b)[0]
    const date = `${earliest.getFullYear()}-${String(earliest.getMonth() + 1).padStart(2, '0')}-${String(earliest.getDate()).padStart(2, '0')}`
    groups.push({
      name: `${date} 出游组`,
      photoIds: members.map(member => member.id)
    })
  }

  return groups
}
