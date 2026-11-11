// Ground, in tiles: rectangles are [x, y, w, h]. Streets are 6 tall (sidewalk, two lanes, sidewalk) or 2 for dirt;
// the avenue is 6 wide from ay to the last street.
var MAP = {
  w: 128,
  h: 345,
  ax: 61,
  ay: 10,
  rail: 8,
  shore: 317,
  // [y, dirt, area] for each street; its lots end at y
  streets: [
    [25, 0, 'downtown'], [52, 0, 'downtown'], [77, 0, 'downtown'], [104, 0, 'downtown'], [123, 0, 'downtown'],
    [142, 0, 'village'], [167, 0, 'village'], [186, 0, 'village'], [200, 0, 'village'], [225, 1, 'farm'],
    [244, 1, 'farm'], [263, 1, 'farm'], [286, 0, 'beach'], [311, 0, 'beach']
  ],
  // where a locked area starts being dimmed, at the edge of the street above it
  tops: { village: 129, farm: 206, beach: 265 },
  plaza: [[50, 10, 28, 15]],
  fence: [[0, 206, 1, 59], [127, 206, 1, 59]],
  props: [['fnt1', 55, 22], ['fnt1', 72, 22], ['bench', 53, 12], ['bench', 74, 12], ['lamp', 52, 23], ['lamp', 76, 23]]
};
