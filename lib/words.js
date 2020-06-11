const randomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min) ) + min;
}

const calcAngle = (weight, angleMode) => {
  const max = Math.PI / 2
  const min = -Math.PI / 2

  switch (angleMode) {
    case 0:
      return 0
    case 1:
      if (weight > 0.5) {
        return 0
      }
      if (Math.random() > 0.6) {
        return Math.random() > 0.5 ? max : min
      } else {
        return 0
      }
    case 2:
      return Math.random() * (max - min + 1) + min
    case 3:
      return Math.PI / 4;
    case 4:
      return -Math.PI / 4;
    case 5:
      if (Math.random() > 0.5) {
        return Math.PI / 4
      } else {
        return -Math.PI / 4
      }
    default:
      return 0;
  }
}

const separateWords = (words, options = {}) => {
  const { keywordNum, keywordColor, fillingWordColor, fontFamily } = options
  if (words.length < keywordNum) {
    throw new Error(`At least ${keywordNum} words is required. We got ${words.length} words instead.`)
  }

  const keywords = words
    .slice(0, keywordNum)
    .map(({ name, weight }) => ({
      name: name.trim(),
      weight: weight < 0.02 ? 0.02 : weight,
      color: keywordColor,
      fontFamily,
    }))
    
  const start = keywordNum ? words.length >= 160 : 0
  const end = Math.min(words.length, start + 200)

  const fillingWords = words
    .slice(start, end)
    .map(({ name }) => ({ name: name.trim(), weight: 0.05, color: fillingWordColor || '#000000' }))
  while (fillingWords.length < 200) {
    fillingWords.push({ ...fillingWords[randomInt(0, fillingWords.length)] })
  }

  return { keywords, fillingWords }
}

const preprocessWords = (words, options = {}) => {
  const {
    angleMode,
  } = options
  const {
    keywords,
    fillingWords,
  } = separateWords(words, options)

  keywords.forEach(word => {
    word.angle = calcAngle(word.weight, angleMode)
  })

  return { keywords, fillingWords }
}

module.exports = {
  preprocessWords,
}
