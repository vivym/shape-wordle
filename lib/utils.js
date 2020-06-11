const LRU = require("lru-cache")
const { createCanvas } = require('canvas')
const assert = require('assert')

const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min) ) + min;
}

const calcDistance = (p1, p2) => {
  return Math.sqrt(
    (p1[0] - p2[0]) * (p1[0] - p2[0]) +
    (p1[1] - p2[1]) * (p1[1] - p2[1])
  )
}

const findExtremePointsAndMinimum = (data, regionID) => {
  const points = []
  let minD = Infinity
  let center = []
  for (let i = 2; i < data.length - 2; i ++) {
    for (let j = 2; j < data[i].length - 2; j ++) {
      if (data[i][j] < minD) {
        minD = data[i][j]
        center = [i, j]
      }
      if (data[i][j] >= 0) {
        continue
      }
      let cnt = 0
      for (let offsetX = -1; offsetX < 2; offsetX ++) {
        for (let offsetY = -1; offsetY < 2; offsetY ++) {
          if (data[i + offsetX][j + offsetY] > data[i][j]) {
            cnt++
          }
        }
      }
      cnt >= 8 && points.push({
        pos: [i, j],
        value: Math.abs(data[i][j]),
        regionID,
      })
    }
  }
  return {
    extremePoints: points,
    minD,
    center,
  }
}

const canvasCtx = createCanvas(500, 400).getContext('2d')

const measureTextSizeCache = new LRU({
  max: 2000,
  maxAge: 1000 * 60 * 30
})


const measureTextSize = (text, fontSize, fontName) => {
  const cacheKey = `${text}_${fontSize}_${fontName}`
  const cachedValue = measureTextSizeCache.get(cacheKey)
  if (cachedValue) {
    return cachedValue
  }
  canvasCtx.font = `${fontSize}px ${fontName}`
  const size = canvasCtx.measureText(text)
  measureTextSizeCache.set(cacheKey, size)
  return size
}

const measureTextHWCache = new LRU({
  max: 2000,
  maxAge: 1000 * 60 * 30
})

const measureTextHW = (left, top, width, height, fontSize, fontName, text) => {
  const cacheKey = `${left}-${top}-${width}-${height}-${fontSize}-${fontName}-${text}`
  const cachedValue = measureTextHWCache.get(cacheKey)
  if (cachedValue) {
    return cachedValue
  }
  canvasCtx.clearRect(0, 0, 450, 400)
  canvasCtx.save()
  canvasCtx.translate(left, fontSize + 10)
  canvasCtx.font = `${fontSize}px ${fontName}`
  canvasCtx.fillStyle = '#000000'
  canvasCtx.fillText(text, 0, 0)
  const bwidth = canvasCtx.measureText(text).width
  canvasCtx.restore()

  const data = canvasCtx.getImageData(left, top, width, height).data
  let first = 0, last = 0, descent = 0
  let r = height

  // Find the last line with a non-white pixel
  while (!last && r) {
    r--
    for (let c = 0; c < width; c++) {
      if (data[r * width * 4 + c * 4 + 3]) {
        last = r
        break
      }
    }
  }

  // Find the first line with a non-white pixel
  while (r) {
    r--
    for (let c = 0; c < width; c++) {
      if (data[r * width * 4 + c * 4 + 3]) {
        if (r > fontSize + 10) descent++
        first = r
        break
      }
    }
  }

  const value = {
    height: last - first,
    width: bwidth,
    descent: descent
  }
  measureTextHWCache.set(cacheKey, value)
  return value
  // TODO:
  // If we've got it then return the height
  if (first !== r) {
    measureTextHWCache[cacheKey] = {
      height: last - first,
      width: bwidth,
      descent: descent
    }
    return measureTextHWCache[cacheKey]
  }

  assert(false, `${cacheKey}, ${first}, ${r} ${last - first} ${bwidth} ${descent}`)
}

const calcScreenMinFontSize = () => {
  const ctx = createCanvas(200, 200).getContext('2d')
  let size = 20
  let hanWidth = undefined, mWidth = undefined
  while (size) {
    ctx.font = `${size}px sans-serif`;
    if ((ctx.measureText('\uFF37').width === hanWidth) &&
      (ctx.measureText('m').width) === mWidth) {
      return size + 1
    }

    //\uFF37是大写的W
    hanWidth = ctx.measureText('\uFF37').width
    mWidth = ctx.measureText('m').width

    size--
  }

  return 0
}

const smoothing = data => {
  const kernelSize = 3
  const offset = Math.floor(kernelSize / 2)

  for (let x = 1; x < data.length - 1; x ++) {
    for (let y = 1; y < data[x].length - 1; y ++) {
      const kernel = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1],
      ]
      let value = 0
      for (let i = 0; i < kernelSize; i ++) {
        for (let j = 0; j < kernelSize; j ++) {
          const offsetX = i - offset
          const offsetY = j - offset
          value += kernel[i][j] * data[x + offsetX][y + offsetY]
        }
      }
      data[x][y] = value / 16 // TODO: 16 ????
    }
  }
}

class Timer {
  constructor (options = {}) {
    this.options = options

    if (!this.options.disabled) {
      this.reset()
    }
  }

  tick (msg) {
    if (!this.options.disabled) {
      console.log(`${msg}: ${Date.now() - this.last}`)
      this.last = Date.now()
    }
  }

  reset () {
    this.last = Date.now()
  }
}

module.exports = {
  randomInt,
  calcDistance,
  findExtremePointsAndMinimum,
  measureTextSize,
  measureTextHW,
  calcScreenMinFontSize,
  smoothing,
  Timer,
}
