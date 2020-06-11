const {
  findExtremePointsAndMinimum,
  calcDistance,
  smoothing,
} = require('./utils')

const preprocessDistanceField = ({ boundaries, dists }, width, height) => {
  boundaries = boundaries.map(boundary => boundary.map(p => p[0]))

  const regions = dists.map((sparseDist, regionID) => {
    const dist = []
    for (let x = 0; x < width; x ++) {
      dist.push(Array(height).fill(1))
    }
    for (const [x, y, value] of sparseDist) {
      dist[x][y] = value
    }

    smoothing(dist)
    smoothing(dist)
    smoothing(dist)

    // find extreme point
    let {
      extremePoints,
      minD,
      center,
    } = findExtremePointsAndMinimum(dist, regionID)
    extremePoints = extremePoints.filter(p => p.pos[0] != center[0] || p.pos[1] != center[1])

    let ok = true
    for (let i = 0; i < extremePoints.length; i ++) {
      const e = extremePoints[i]
      if (calcDistance(extremePoints[i].pos, center) < 100) {
        if (i >= 1 && extremePoints[i - 1].pos[0] === center[0] && extremePoints[i - 1].pos[1] === center[1]) {
          extremePoints.splice(i, 1)
        } else if (e.value < Math.abs(minD)) {
          e.pos = center
          e.value = Math.abs(minD)
        }
        ok = false
      }
    }

    ok && extremePoints.push({
      pos: center,
      value: Math.abs(minD),
      regionID,
    })

    return {
      boundary: boundaries[regionID],
      dist,
      extremePoints,
    }
  })

  let extremePoints = regions
    .map(region => region.extremePoints)
    .reduce((total, e) => total.concat(e), [])

  const points = []
  extremePoints.forEach(e => {
    let ok = true
    for (let i = 0; i < points.length; i ++) {
      const p = points[i]
      if (calcDistance(e.pos, p.pos) < 60) {
        if (p.value < e.value) {
          points[i] = e
        }
        ok = false
      }
    }
    ok && points.push(e)
  })
  extremePoints = points

  regions.forEach((region, regionID) => {
    const centers = extremePoints
      .filter(e => e.regionID === regionID)
      .sort((a, b) => b.value - a.value)
    
    const sum = centers.reduce((total, { value }) => total + value * value, 0)
    centers.forEach(e => {
      e.ratio = e.value * e.value / sum
    })
    
    region.center = centers
  })

  return regions
}

module.exports = {
  preprocessDistanceField,
}
