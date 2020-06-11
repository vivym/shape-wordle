const { createCanvas } = require('canvas')

const defaultOptions = {
  fontFamily: 'siyuan',
  fontWeight: 'normal',
  resizeFactor: 4,
  width: 900,
  height: 600,
  keywords: [],
  fillingWords: [],
}

const draw = options => {
  const { width, height, fontWeight, fontFamily, resizeFactor, keywords, fillingWords } = {
    ...defaultOptions,
    ...options,
  }

  const canvas = createCanvas(width * resizeFactor, height * resizeFactor)
  const ctx = canvas.getContext('2d')

  keywords.forEach(({ color, fontSize, transX, transY, rotate, name, fillX, fillY }) => {
    ctx.save()
    ctx.font = `${fontWeight} ${fontSize * resizeFactor}px ${fontFamily}`

    ctx.fillStyle = color
    ctx.translate(transX * resizeFactor, transY * resizeFactor)
    ctx.rotate(rotate)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabet'
    ctx.fillText(name, fillX * resizeFactor, fillY * resizeFactor)
    ctx.restore()
  })

  fillingWords.forEach(({ color, fontSize, transX, transY, rotate, name, fillX, fillY }) => {
    ctx.save()
    ctx.font = `${fontWeight} ${fontSize * resizeFactor}px ${fontFamily}`

    ctx.fillStyle = color
    ctx.translate(transX * resizeFactor, transY * resizeFactor)
    ctx.rotate(rotate)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, fillX * resizeFactor, fillY * resizeFactor)
    ctx.restore()
  })

  return canvas.toBuffer()
}

module.exports = draw
