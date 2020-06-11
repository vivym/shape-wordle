const defaultOptions = {
  keywordNum: 60,
  keywordColor: '#000000',
  fillingWordColor: '#000000',
  fontFamily: 'siyuan',
  // canvas
  width: 900,
  height: 600,

  colors: [
    '#000000',
    '#e5352b',
    '#e990ab',
    '#ffd616',
    '#96cbb3',
    '#91be3e',
    '#39a6dd',
    '#eb0973',
    '#dde2e0',
    '#949483',
    '#f47b7b',
    '#9f1f5c',
    '#ef9020',
    '#00af3e',
    '#85b7e2',
    '#29245c',
    '#00af3e',
  ],

  isPlanA: true,

  maxFontSize: 100,
  minFontSize: 2,
  fillingFontSize: 10,
  angleMode: 0, // 角度模式，0-全横，1-横竖，2-random，3-45度向上\\，4-45度向下//，5-45度向上以及向下/\\/
  isMaxMatch: false,

  eps: 0.0000001,
}

module.exports = {
  defaultOptions,
}
