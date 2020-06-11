const assert = require('assert')
const { createCanvas } = require('canvas')
const { defaultOptions } = require('./defaults')
const { preprocessDistanceField } = require('./distanceField')
const { preprocessWords } = require('./words')
const wordleAlgorithm = require('./wordle')
const {
  measureTextSize,
  measureTextHW,
  calcScreenMinFontSize,
} = require('./utils')

class ShapeWordle {
  constructor (options = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
    }
    this.regions = []
  }

  async generate (words, regionMask, distanceField) {
    const {
      width,
      height,
    } = this.options

    this.options.regionMask = regionMask

    // boundary and distance field
    this.regions = preprocessDistanceField(distanceField, width, height)

    const {
      keywords,
      fillingWords,
    } = preprocessWords(words, this.options)

    this.allocateWords(keywords)
    this.allocateEpIndex(keywords)
    this.createBox(keywords)

    const fillingWordsWithPos = this.drawFillingWords(keywords, fillingWords)
    const keywordsWithPos = this.drawKeywords(keywords)
    return {
      fillingWords: fillingWordsWithPos,
      keywords: keywordsWithPos,
    }
  }

  drawFillingWords (keywords, fillingWords) {
    const {
      width: canvasWidth,
      height: canvasHeight,
      fillingFontSize,
      regionMask,
      angleMode,
      fontFamily,
      maxFontSize,
      minFontSize,
    } = this.options
    const g = 1
    const settings = {
      rotateRatio: 0.5,
      gridSize: 6,
      minRotation: -Math.PI / 2,
      maxRotation: Math.PI / 2,
      ellipticity: 1,
    }
    const rotationRange = Math.abs(settings.maxRotation - settings.minRotation)
    const screenMinFontSize = calcScreenMinFontSize()
    const wordLayouts = []

    const isInShapePoint = point => regionMask[point.y][Math.floor(point.x)] >= 0

    const seeBox = () => {
      const grid = []
      const wordCanvas = createCanvas(canvasWidth, canvasHeight)
      const ctx = wordCanvas.getContext('2d')
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      ctx.beginPath()
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
      keywords.forEach(word => {
        if (word.state) {
          const [x, y] = word.position
          const { angle } = word
         
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(angle)
          ctx.lineWidth = 2
          ctx.strokeStyle = "green"
          const fontSize = (maxFontSize - minFontSize) * Math.sqrt(word.weight) + minFontSize
          ctx.font = `${fontSize}px ${word.fontFamily}`
          ctx.fillStyle = word.color
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabet'
          ctx.strokeText(word.name, 0, word.height - word.descent - word.gap)
          ctx.fillText(word.name, 0, word.height - word.descent - word.gap)
          ctx.restore()
        }
      })

      const imageData = ctx.getImageData(0, 0, canvasWidth * g, canvasHeight * g).data

      const bgCtx = createCanvas(100, 100).getContext('2d')
      bgCtx.fillStyle = "#000000"
      bgCtx.fillRect(0, 0, 1, 1)
      const bgPixel = bgCtx.getImageData(0, 0, 1, 1).data


      let gx = ngx
      while (gx--) {
        grid[gx] = []
        let gy = ngy
        while (gy--) {
          let y = g
          singleGridLoop: while (y--) {
            let x = g
            while (x--) {
              let i = 4
              while (i--) {
                if ((imageData[((gy * g + y) * ngx * g + (gx * g + x)) * 4 + i] !== bgPixel[i])
                  || !isInShapePoint({ x: (gx * g + x), y: (gy * g + y) })) {
                  grid[gx][gy] = false
                  break singleGridLoop
                }
              }
            }
          }
          if (grid[gx][gy] !== false) {
            grid[gx][gy] = true
          }
        }
      }

      return grid
    }

    const getRotateDeg = () => {
      if (angleMode == 2) {
        return Math.random() * (settings.maxRotation - settings.minRotation + 1) + settings.minRotation
      } else if (angleMode == 3) {
        return Math.PI / 4
      } else if (angleMode == 4) {
        return -Math.PI / 4
      } else if (angleMode == 5) {
        return Math.random() > 0.5 ? Math.PI / 4 : -Math.PI / 4
      } else {
        return Math.random() > settings.rotateRatio ? 0 : settings.minRotation + Math.floor(Math.random() * 2) * rotationRange
      }
    }

    const getTextInfo = (word, rotateDeg, fontSize) => {
      // calculate the acutal font size
      // fontSize === 0 means weightFactor function wants the text skipped,
      // and size < minSize means we cannot draw the text.
      if (fontSize <= 0) return false

      // Scale factor here is to make sure fillText is not limited by
      // the minium font size set by browser.
      // It will always be 1 or 2n.
      let mu = 1
      if (fontSize < screenMinFontSize) {
        mu = 2
        while (mu * fontSize < screenMinFontSize) {
          mu += 2
        }
      }
      const fontWeight = 'normal'
      let fcanvas = createCanvas(100, 100)
      let fctx = fcanvas.getContext('2d', { willReadFrequently: true })
      fctx.font = `${fontWeight} ${fontSize * mu}px ${fontFamily}`

      const fw = fctx.measureText(word.name).width / mu
      const fh = Math.max(
        fontSize * mu,
        fctx.measureText('m').width,
        fctx.measureText('\uFF37').width
      ) / mu

      // Create a boundary box that is larger than our estimates,
      // so text don't get cut of (it sill might)
      const fgw = Math.ceil(fw + fh * 2 / g)
      const fgh = Math.ceil(fh * 3 / g)
      const boxWidth = fgw * g
      const boxHeight = fgh * g
      
      // Calculate the proper offsets to make the text centered at
      // the preferred position.

      // This is simply half of the width.
      const fillTextOffsetX = -fw / 2
      // Instead of moving the box to the exact middle of the preferred
      // position, for Y-offset we move 0.4 instead, so Latin alphabets look
      // vertical centered.
      const fillTextOffsetY = -fh * 0.4

      const cgh = Math.ceil((boxWidth * Math.abs(Math.sin(rotateDeg)) +
        boxHeight * Math.abs(Math.cos(rotateDeg))) / g)
      const cgw = Math.ceil((boxWidth * Math.abs(Math.cos(rotateDeg)) +
        boxHeight * Math.abs(Math.sin(rotateDeg))) / g)
      const width = cgw * g
      const height = cgh * g

      fcanvas = createCanvas(width, height)
      fctx = fcanvas.getContext('2d', { willReadFrequently: true })

      // Scale the canvas with |mu|.
      fctx.scale(1 / mu, 1 / mu)
      fctx.translate(width * mu / 2, height * mu / 2)
      fctx.rotate(-rotateDeg)
      fctx.font = `${fontWeight} ${fontSize * mu}px ${fontFamily}`
      fctx.fillStyle = '#000'
      fctx.textBaseline = 'middle'
      fctx.lineWidth = 1
      fctx.strokeStyle = "#000"
      fctx.strokeText(word.name, fillTextOffsetX * mu,
        (fillTextOffsetY + fontSize * 0.5) * mu)
      fctx.fillText(word.name, fillTextOffsetX * mu,
        (fillTextOffsetY + fontSize * 0.5) * mu)

      const imageData = fctx.getImageData(0, 0, width, height).data

      // Read the pixels and save the information to the occupied array
      const occupied = []
      let gx = cgw, gy, x, y
      const bounds = [cgh / 2, cgw / 2, cgh / 2, cgw / 2]
      while (gx--) {
        gy = cgh
        while (gy--) {
          y = g
          singleGridLoop: {
            while (y--) {
              x = g
              while (x--) {
                if (imageData[((gy * g + y) * width +
                  (gx * g + x)) * 4 + 3]) {
                  occupied.push([gx, gy])

                  if (gx < bounds[3]) {
                    bounds[3] = gx
                  }
                  if (gx > bounds[1]) {
                    bounds[1] = gx
                  }
                  if (gy < bounds[0]) {
                    bounds[0] = gy
                  }
                  if (gy > bounds[2]) {
                    bounds[2] = gy
                  }
                  break singleGridLoop
                }
              }
            }
          }
        }
      }

      return {
        mu,
        occupied,
        bounds,
        gw: cgw,
        gh: cgh,
        fillTextOffsetX,
        fillTextOffsetY,
        fillTextWidth: fw,
        fillTextHeight: fh,
        fontSize: fontSize
      }
    }

    const canFitText = (gx, gy, gw, gh, occupied, grid) => {
      // Go through the occupied points,
      // return false if the space is not available.
      let i = occupied.length
      while (i--) {
        var px = gx + occupied[i][0]
        var py = gy + occupied[i][1]
  
        if (px >= ngx || py >= ngy || px < 0 || py < 0) {
          return false
        }
  
        if (!grid[px][py]) {
          return false
        }
      }
      return true
    }

    const drawText = (gx, gy, info, word, rotateDeg, alpha, color) => { 
      const x = (gx + info.gw / 2) * g
      const y = (gy + info.gh / 2) * g
      return Math.floor(y) < canvasHeight && Math.floor(x) < canvasWidth ? {
        name: word,
        fontSize: info.fontSize,
        color,
        rotate: -rotateDeg,
        transX: x,
        transY: y,
        fillX: info.fillTextOffsetX,
        fillY: info.fillTextOffsetY + fontSize * 0.5,
      } : undefined
    }

    const updateGrid = (grid, gx, gy, info) => {
      const occupied = info.occupied
  
      let i = occupied.length
      while (i--) {
        const px = gx + occupied[i][0]
        const py = gy + occupied[i][1]
  
        if (px >= ngx || py >= ngy || px < 0 || py < 0) {
          continue
        }
  
        grid[px][py] = false
      }
    }

    const getSpiralNudgerCircle = (attempt, lim) => {
      // 获取螺旋线增量的方法
      const rad = powerMap(0.5, attempt, 0, lim, 1, maxRadius)
      const thetaIncrement = powerMap(1, attempt, 0, lim, 0.5, 0.3)
      const theta = thetaIncrement * attempt
      const x = Math.cos(theta) * rad
      const y = Math.sin(theta) * rad
      return [x, y]
    }

    const powerMap = (power, v, min1, max1, min2, max2) => {
      const val = Math.pow(v / (max1 - min1), power)
      return (max2 - min2) * val + min2
    }

    const putWord = (word, fontSize, alpha, grid) => {
      const rotateDeg = getRotateDeg()
      const info = getTextInfo(word, rotateDeg, fontSize)
      if (!info)  return false

      const tryToPutWordAtPoint = gxy => {
        const gx = Math.floor(gxy[0] - info.gw / 2)
        const gy = Math.floor(gxy[1] - info.gh / 2)
        const gw = info.gw
        const gh = info.gh

        // If we cannot fit the text at this position, return false
        // and go to the next position.
        if (!canFitText(gx, gy, gw, gh, info.occupied, grid)) {
          return false
        }

        // Actually put the text on the canvas
        const layout = drawText(gx, gy, info, word.name, rotateDeg, alpha, word.color)
        layout && wordLayouts.push(layout)

        // Mark the spaces on the grid as filled
        updateGrid(grid, gx, gy, info)

        // Return true so some() will stop and also return true.
        return true
      }


      const placeWord = () => {
        const xmax = canvasWidth / 2 + 50, xmin = canvasWidth / 2 - 50
        const ymax = canvasHeight / 2 + 50, ymin = canvasHeight / 2 - 50
    
        const x = Math.round(Math.random() * (xmax - xmin + 1) + xmin)
        const y = Math.round(Math.random() * (ymax - ymin + 1) + ymin)
    
        return [x, y]
      }
      const pos = placeWord()

      const lim = 12000
      for (let i = 0; i < lim; i++) {
        const nudge = getSpiralNudgerCircle(i, lim)
        pos[0] += nudge[0] / 2
        pos[1] += nudge[1] / 2
  
        const state = tryToPutWordAtPoint([Math.round(pos[0] / g), Math.round(pos[1] / g)])
        if (state) return true
      }
  
      return false
    }
    const ngx = Math.ceil(canvasWidth / g)
    const ngy = Math.ceil(canvasHeight / g)
    const maxRadius = Math.floor(Math.sqrt(ngx * ngx + ngy * ngy) / 2)

    const grid = seeBox()

    let fontSize = fillingFontSize
    fillingWords.forEach(word => {
      putWord(word, fontSize, 0.8, grid)
    })
    fillingWords.forEach(word => {
      putWord(word, fontSize, 0.8, grid)
    })
    fontSize -= 2
    fillingWords.forEach(word => {
      putWord(word, fontSize, 0.7, grid)
    })
    fillingWords.forEach(word => {
      putWord(word, fontSize, 0.7, grid)
    })
    for (let _ = 0; _ < 3; _ ++) {
      fontSize -= 3
      fillingWords.forEach(word => {
        putWord(word, fontSize, 0.6, grid)
      })
      fillingWords.forEach(word => {
        putWord(word, fontSize, 0.6, grid)
      })
    }

    return wordLayouts
  }

  drawKeywords (words) {
    const {
      maxFontSize,
      minFontSize,
    } = this.options
    return words.filter(word => word.state && word.position).map(word => ({
      name: word.name,
      fontSize: (maxFontSize - minFontSize) * Math.sqrt(word.weight) + minFontSize,
      color: word.color,
      rotate: word.angle,
      transX: word.position[0],
      transY: word.position[1],
      fillX: 0,
      fillY: word.height - word.descent - word.gap,
    }))
  }

  adjustWord (word, maxFontSize) {
    const {
      eps,
      fontFamily,
      minFontSize,
    } = this.options
    const fontSize = (maxFontSize - minFontSize) * Math.sqrt(word.weight) + minFontSize
    const { width } = measureTextSize(word.name, fontSize, fontFamily)
    word.gap = 2
    word.width = width / 2 + 2

    const textSize = measureTextHW(0, 0, 150, 200, fontSize, word.fontFamily, word.name)
    word.descent = textSize.descent
    word.height = textSize.height / 2 + 2

    if (Math.abs(word.weight - 0.5) > eps) {
      word.box = []
      const textSize = measureTextHW(0, 0, 200, 200, fontSize, word.fontFamily, 'a')
      
      const ah = textSize.height / 2
      const ad = textSize.descent
      word.box.push([
        -word.width,
        word.height - word.descent + ad - 2 * (ah + word.gap),
        word.width,
        ah + word.gap,
      ])

      const purewidth = -(word.width - word.gap)
      let occupied = 0
      for (let i = 0; i < word.name.length; i ++) {
        const textSize = measureTextHW(0, 0, 150, 200, fontSize, word.fontFamily, word.name[i])
        const ch = textSize.height / 2
        const cw = textSize.width / 2
        const cd = textSize.descent
        if (ch !== ah) {
          word.box.push([
            occupied + purewidth - word.gap,
            word.height - word.descent + cd - 2 * ch - 2 * word.gap,
            cw + word.gap,
            ch + word.gap
          ])
        }
        occupied += cw * 2
      }
    }
  }

  createBox (words) {
    const { regions } = this
    const {
      keywordNum,
      isMaxMatch,
    } = this.options

    const createRandomArray = (length) => {
      const remain = Math.floor(0.25 * keywordNum)
      const arr = Array(length - remain).fill().map((_, i) => i)
      for (let i = length - remain; i < length; i ++) {
        arr.splice(Math.floor(Math.random() * arr.length), 0, i)
      }
      return arr
    }

    const deepCopyPosition = () => words.map(word => [...(word.position || [])])

    const randomArray = createRandomArray(words.length)
    let prePosition = null

    words.forEach(word => {
      this.adjustWord(word, this.options.maxFontSize)
      word.state = false
    })
    for (let regionID = 0; regionID < regions.length; regionID ++) {
      const region = regions[regionID]
      if (isMaxMatch) {
        // TODO:
        assert(false, 'not implemented yet.')
      } else {
        let isOK = true
        for (let cont = 0; cont < 1; cont ++) {
          let wordlepara = { drawnWords: [], state: true }
          for (let i of randomArray) {
            const word = words[i]
            if (word.regionID === regionID) {
              word.width++
              word.height++
              word.gap++

              this.placeWord(word, region.center[word.epID], regionID)
              wordlepara = wordleAlgorithm(
                wordlepara.drawnWords,
                word,
                this.options,
                regionID,
                regions,
              )
              if (wordlepara.state === false) {
                // wordlepara.state 这个状态代表有没有单词在运行Wordle算法的时候旋转到了图形外面
                isOK = false
                break
              }
            }
          }

          if (!isOK) {
            if (cont === 0 && this.options.maxFontSize >= 10) {
              // reduce maxFontSize and restart
              regionID = -1
              this.options.maxFontSize--
              words.forEach(word => this.adjustWord(word, this.options.maxFontSize))
            } else {
              if (prePosition !== null) {
                words.forEach((word, idx) => {
                  word.position = prePosition[idx]
                })
              }
              break
            }
          } else {
            prePosition = deepCopyPosition()
          }
        }
      }
    }

    if (isMaxMatch) {
      regions.forEach((region, regionID) => {
        let isOK = true
        prePosition = deepCopyPosition()
        for (let cont = 0; cont < 15; cont ++) {
          const  wordlepara = { drawnWords: [], state: true }
          for (let i of randomArray) {
            const word = words[i]
            if (word.regionID === regionID) {
              word.width++
              word.height++
              word.gap++

              wordlepara = wordleAlgorithm(
                wordlepara.drawnWords,
                word,
                this.options,
                regionID,
                regions,
              )

              if (wordlepara.state === false) {
                isOK = false
                break
              }
            }
          }
          if (!isOK) {
            words.forEach((word, idx) => {
              word.position = prePosition[idx]
            })
          } else {
            prePosition = deepCopyPosition()
          }
        }
      })
    }
  }

  placeWord (word, center, regionID) {
    const {
      isMaxMatch,
      eps,
      regionMask
    } = this.options

    let tem = isMaxMatch ? center.value / 2 : center.value / 3
    if (Math.abs(word.weight - 0.8) > eps) {
      tem = center.value / 5
    }

    const xmax = center.pos[0] + tem, xmin = center.pos[0] - tem
    const ymax = center.pos[1] + tem, ymin = center.pos[1] - tem

    let x, y
    do {
      x = Math.round(Math.random() * (xmax - xmin + 1) + xmin)
      y = Math.round(Math.random() * (ymax - ymin + 1) + ymin)
    } while (regionMask[y][x] !== regionID)

    word.position = [x, y]
  }

  allocateEpIndex (words) {
    const { regions } = this
    const {
      isMaxMatch,
    } = this.options

    const wordsMinWeight = Math.min(...words.map(word => word.weight))
    regions.forEach((region, regionID) => {
      let wordsSum = 0
      region.center.forEach(c => {
        c.eww = c.ratio * region.wordsWeight / region.center[0].ratio
        c.ewn = c.value < 20 ? 0 : Math.round(c.ratio * region.wordsNum)
        wordsSum += c.ewn
        c.eww = Math.max(c.eww, wordsMinWeight)
      })
      if (wordsSum !== region.wordsNum) {
        region.center[0].ewn += region.wordsNum - wordsSum
      }
      let currIdx = 0
      words.forEach(word => {
        if (word.regionID === regionID) {
          let cnt = 0
          word.epID = -1
          do {
            if (region.center[currIdx].ewn > 0 && word.weight <= region.center[currIdx].eww) {
              word.epID = currIdx
              region.center[currIdx].ewn--
            }
            currIdx = (currIdx + 1) % region.center.length
            cnt++
          } while (word.epID === -1 && cnt < region.center.length * 2)
          if (word.epID === -1) {
            word.epID = 0
          }
        }
      })
    })

    const computeRatios = (maxFontSize) => {
      const {
        minFontSize,
      } = this.options

      return regions.map((region, regionID) => {
        let area = 0
        words.forEach(word => {
          if (word.regionID === regionID) {
            const fontSize = (maxFontSize - minFontSize) * Math.sqrt(word.weight) + minFontSize
            const { width } = measureTextSize(word.name, fontSize, word.fontFamily)
            area += (fontSize + 1) * (width + 4)
          }
        })
        return area / region.area
      })
    }

    if (isMaxMatch) {
      do {
        const ratios = computeRatios()
        const maxRatio = Math.max(...ratios)
        const minRatio = Math.min(...ratios)
        if (maxRatio < 0.75) {
          this.options.maxFontSize++
        }
        if (minRatio > 0.8) {
          this.options.maxFontSize--
        }
      } while (maxRatio < 0.75 || minRatio > 0.8)
    } else {
      let l = this.options.minFontSize, r = this.options.maxFontSize
      let fontSize = r
      while (r - l > 1) {
        const mid = Math.floor((l + r) / 2)
        const ratios = computeRatios(mid)
        if (ratios.every(ratio => ratio <= 0.65)) {
          fontSize = mid
          l = mid
        } else {
          r = mid
        }
      }
      this.options.maxFontSize = fontSize
    }
  }

  allocateWords (words) {
    const { regions } = this
    const {
      colors,
    } = this.options

    let currIdx = this.computeAreaPreInfo(words)
    const values = regions.map(region => region.center[0].value)
    const valueMax = Math.max(...values)
    const valueMaxIdx = values.indexOf(valueMax)

    const wordsNums = regions.map(region => region.wordsNum)

    words.forEach(word => {
      let cnt = 0
      word.regionID = -1
      do {
        if (
          wordsNums[currIdx] > 0 &&
          word.weight <= regions[currIdx].wordsWeight
        ) {
          if (
            (regions[currIdx].center[0].value < 24 && word.name.length <= 5) ||
            regions[currIdx].center[0].value >= 24
          ) {
            word.regionID = currIdx
            wordsNums[currIdx]--
            currIdx = (currIdx + 1) % regions.length
          }
        } else {
          currIdx = (currIdx + 1) % regions.length
        }
        cnt++
      } while (word.regionID === -1 && cnt < regions.length * 3)
      if (word.regionID === -1) {
        word.regionID = valueMaxIdx
        if (!word.color) {
          word.color = colors[word.regionID % colors.length]
        }
      }
    })
  }

  computeAreaPreInfo (words) {
    const { regions } = this
    const {
      keywordNum,
      regionMask,
      isPlanA,
    } = this.options

    regions.forEach(region => {
      region.area = 0
      region.value = region.center[0].value
    })

    let totalArea = 0
    for (let i = 0; i < regionMask.length; i++) {
      for (let j = 0; j < regionMask[i].length; j++) {
        const regionID = regionMask[i][j]
        if (regionID >= 0) {
          regions[regionID].area++
          totalArea++
        }
      }
    }

    const wordsMinWeight = Math.min(...words.slice(0, keywordNum).map(word => word.weight))
    
    const areas = regions.map(region => region.area)
    const areaMax = Math.max(...areas)
    const areaMaxIdx = areas.indexOf(areaMax)

    const values = regions.map(region => region.value)
    const valueMax = Math.max(...values)

    let wordsSum = 0
    regions.forEach(region => {
      const { area, value } = region
      const wordsNum = value <= 18 && valueMax > 45 ? 0 : Math.round(area / totalArea * keywordNum)
      wordsSum += wordsNum
      
      let wordsWeight = isPlanA ? area / areaMax : value / valueMax
      if (wordsNum <= 3) {
        wordsWeight = wordsMinWeight
      }
      
      region.wordsNum = wordsNum
      region.wordsWeight = wordsWeight
    })
    if (wordsSum !== keywordNum) {
      regions[areaMaxIdx].wordsSum += keywordNum - wordsSum
    }

    return areaMaxIdx
  }
}

module.exports = ShapeWordle
