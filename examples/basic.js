const fs = require('fs');
const path = require('path')
const { registerFont } = require('canvas')
const { ShapeWordle, draw } = require('../')
const { Timer } = require('../lib/utils')

const loadJSONFile = path => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        reject(err)
      }

      resolve(JSON.parse(data.toString()))
    })
  })
}

const run = async () => {
  registerFont(path.join(__dirname, 'assets', 'fonts', 'siyuan.ttf'), { family: 'siyuan' })

  const shapeWordle = new ShapeWordle()

  const regionMask = await loadJSONFile(
    path.join(__dirname, 'assets', 'cache', 'Shandong', 'regionMask.json')
  )
  const distField = await loadJSONFile(
    path.join(__dirname, 'assets', 'cache', 'Shandong', 'dist.json')
  )

  const words = await loadJSONFile(
    path.join(__dirname, 'assets', 'cache', 'words.json')
  )

  const timer = new Timer()

  const { keywords, fillingWords } = await shapeWordle.generate(
    words, regionMask, distField
  )
  timer.tick('ShapeWordle layout')

  const image = draw({ keywords, fillingWords })

  timer.tick('ShapeWordle drawing')

  fs.writeFileSync('test.png', image)
  console.log('done')
}

run().catch(console.error)
