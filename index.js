/**
 * @namespace antGen
 * @description Utility object for generating Langton's Ant rules compatible with the EvolveCode turmite simulator.
 */
const antGen = {
  /** 
   * Number of pixels per grid cell.
   * @type {number}
   * @default 8
   */
  scale: 8,

  /** 
   * Canvas width in pixels.
   * @type {number}
   * @default 1366
   */
  width: 1366,

  /** 
   * Canvas height in pixels.
   * @type {number}
   * @default 768
   */
  height: 768,

  /** 
   * Number of grid columns, calculated as `Math.ceil(width / scale)`.
   * @type {number}
   */
  gridCols: 171, 

  /** 
   * Number of grid rows, calculated as `Math.ceil(height / scale)`.
   * @type {number}
   */
  gridRows: 96,

  /** 
   * Starting position `[x, y]` on the grid.
   * @type {number[]|undefined}
   */
  startPos: undefined,

  /** 
   * Ending position and direction on the grid: `[x, y, direction]`.
   * Direction is one of `"right"`, `"left"`, `"up"`, `"down"`.
   * @type {Array.<number|string>|undefined}
   */
  endPosDirc: undefined,

  /** 
   * Flag to check if grid is initialized.
   * @type {boolean}
   * @default false
   */
  gridInited: false,

  /** 
   * 2D array representing the grid of color indices.
   * @type {number[][]}
   */
  grid: [],

  /** 
   * JSON object storing generated turmite rules.
   * @type {Object.<number, Array.<{writeColor:number, move:string, nextState:number}>>}
   */
  json: {},

  /** 
   * Counter for the next available state index in rule generation.
   * @type {number}
   * @default 0
   */
  startState: 0,

  /**
   * Wraps given coordinates around the toroidal grid, handling looping edges.
   * Initializes the grid if not yet initialized.
   * @param {{x:number, y:number}} cords - Coordinates to check.
   * @returns {{x:number, y:number}} Coordinates wrapped within grid bounds.
   */
  checkCords: function({ x, y }) {
    if (!this.gridInited) {
      this.init();
    }
    x = ((x % this.gridCols) + this.gridCols) % this.gridCols;
    y = ((y % this.gridRows) + this.gridRows) % this.gridRows;
    return { x, y };
  },

  /**
   * Gets the color index at the specified grid coordinates.
   * @param {{x:number, y:number}} cords - Coordinates to get.
   * @returns {number} Color index at the position.
   */
  get: function(cords) {
    if (!this.gridInited) {
      this.init();
    }
    cords = this.checkCords(cords);
    return this.grid[cords.x][cords.y];
  },

  /**
   * Sets the color index at the specified grid coordinates.
   * @param {{x:number, y:number}} cords - Coordinates to set.
   * @param {number} value - Color index to assign.
   * @returns {number} The assigned color index.
   */
  set: function(cords, value) {
    if (!this.gridInited) {
      this.init();
    }
    cords = this.checkCords(cords);
    this.grid[cords.x][cords.y] = value;
    return value;
  },

  /**
   * Sets a single grid cell to a given color index.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {number} color - Color index to set.
   */
  colorPoint: function(x, y, color) {
    this.set({ x, y }, color);
  },

  /**
   * Fills a rectangular area on the grid with a specific color index.
   * Coordinates are wrapped around the grid.
   * @param {number} x1 - X coordinate of the first corner.
   * @param {number} y1 - Y coordinate of the first corner.
   * @param {number} x2 - X coordinate of the opposite corner.
   * @param {number} y2 - Y coordinate of the opposite corner.
   * @param {number} color - Color index to fill with.
   */
  fillArea: function(x1, y1, x2, y2, color) {
    if (!this.gridInited) {
      this.init();
    }
    ({ x: x1, y: y1 } = this.checkCords({ x: x1, y: y1 }));
    ({ x: x2, y: y2 } = this.checkCords({ x: x2, y: y2 }));
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];
    for (let i = x1; i <= x2; i++) {
      this.grid[i].fill(color, y1, y2 + 1);
    }
  },

  /**
   * Calculates the shortest toroidal delta between two points along one axis.
   * @param {number} p1 - Starting position coordinate.
   * @param {number} p2 - Ending position coordinate.
   * @param {number} size - Size of the axis (width or height).
   * @returns {number} The delta (can be negative for wrapping backward).
   */
  getDelta: function(p1, p2, size) {
    let delta = (p2 - p1 + size) % size;
    if (delta > size / 2) delta -= size;
    return delta;
  },

  /**
   * Calculates Manhattan distance and deltas between two points on the toroidal grid.
   * @param {{x:number,y:number}} p1 - First point.
   * @param {{x:number,y:number}} p2 - Second point.
   * @returns {{dist:number, dx:number, dy:number}} Distance and deltas on X and Y.
   */
  getDistAndDelta: function(p1, p2) {
    const dx = this.getDelta(p1.x, p2.x, this.gridCols);
    const dy = this.getDelta(p1.y, p2.y, this.gridRows);
    return { dist: Math.abs(dx) + Math.abs(dy), dx, dy };
  },

  /**
   * Sets the end position and facing direction of the ant.
   * Does nothing if the position and direction are unchanged.
   * @param {number} x - X coordinate.
   * @param {number} y - Y coordinate.
   * @param {string} [direction="right"] - Facing direction ("right", "left", "up", "down").
   */
  setStartLoc: function(x, y, direction = "right") {
    ({ x, y } = this.checkCords({ x, y }));
    if (
      this.endPosDirc &&
      x === this.endPosDirc[0] &&
      y === this.endPosDirc[1] &&
      direction === this.endPosDirc[2]
    )
      return;
    this.endPosDirc = [x, y, direction];
  },

  /**
   * Parses the grid to create a JSON state machine describing the ant's path.
   * Finds all points >0, sorts by closest next point, and generates move/write rules.
   */
  parseGrid: function() {
    if (!this.gridInited) {
      this.init();
    }
    this.json = {};
    this.startState = 0;

    // Gather all points with color > 0
    let points = [];
    for (let x = 0; x < this.gridCols; x++) {
      for (let y = 0; y < this.gridRows; y++) {
        if (this.grid[x][y] > 0) {
          points.push({ x, y });
        }
      }
    }

    // If no points found, no parsing needed
    if (points.length === 0) {
      return;
    }

    // Sort points by distance from startPos to establish traversal order
    const start = { x: this.endPosDirc[0], y: this.endPosDirc[1] };
    let current = start;
    let orderedPoints = [];

    while (points.length) {
      // Find closest point to current
      points.sort((a, b) => {
        const distA = this.getDistAndDelta(current, a).dist;
        const distB = this.getDistAndDelta(current, b).dist;
        return distA - distB;
      });
      const next = points.shift();
      orderedPoints.push(next);
      current = next;
    }

    // Build rules between points in orderedPoints
    for (let i = 0; i < orderedPoints.length; i++) {
      const p = orderedPoints[i];
      const nextP = orderedPoints[(i + 1) % orderedPoints.length]; // wrap around to start

      const { dx, dy } = this.getDistAndDelta(p, nextP);
      let move = "";
      if (dx === 1 || dx < -1) move = ">";
      else if (dx === -1 || dx > 1) move = "<";
      else if (dy === 1 || dy < -1) move = "v";
      else if (dy === -1 || dy > 1) move = "^";

      this.addMoveRule(
        i,
        this.grid[p.x][p.y],
        move,
        (i + 1) % orderedPoints.length
      );
    }
  },

  /**
   * Adds a custom move rule to the JSON state machine.
   * Adjusts state numbers relative to the current startState.
   * @param {number} state - Current state number (relative to startState).
   * @param {number} writeColor - Color index to write.
   * @param {string} move - Move direction: ">", "<", "^", or "v".
   * @param {number} [nextState] - Next state number (relative to startState).
   */
  addMoveRule: function(state, writeColor, move, nextState) {
    state += this.startState;
    nextState = nextState !== undefined ? nextState + this.startState : state;
    if (!this.json[state]) this.json[state] = [];
    this.json[state].push({
      writeColor,
      move,
      nextState,
    });
  },

  /**
   * Initializes the grid arrays and sets default start/end positions.
   * Automatically calculates grid dimensions from canvas size and scale.
   */
  init: function() {
    this.gridCols = Math.ceil(this.width / this.scale);
    this.gridRows = Math.ceil(this.height / this.scale);
    this.startPos = [Math.floor(this.gridCols / 2), Math.floor(this.gridRows / 2)];
    this.endPosDirc = [Math.floor(this.gridCols / 2), Math.floor(this.gridRows / 2), "right"];
    this.grid = Array(this.gridCols)
      .fill(null)
      .map(() => Array(this.gridRows).fill(0));
    this.gridInited = true;
  },

  /**
   * Array of predefined RGB color objects used for matching.
   * @type {Array.<{r:number, g:number, b:number}>}
   */
  colors: [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 0, b: 0 },
    { r: 255, g: 165, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 105, b: 180 },
    { r: 218, g: 112, b: 214 },
    { r: 138, g: 43, b: 226 },
  ],

  /**
   * Finds the closest color index to the given RGB value from the predefined colors.
   * @param {{r:number, g:number, b:number}} RGB - RGB color to match.
   * @returns {number} Index of closest matching color.
   */
  convertRGB: function (RGB) {
    const colorDistance = (color1, color2) => {
      const { r: r1, g: g1, b: b1 } = color1;
      const { r: r2, g: g2, b: b2 } = color2;
      return Math.sqrt(
        Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
      );
    };
    let shortestDist = Infinity;
    let colorNum = null;
    this.colors.forEach((c, i) => {
      const dist = colorDistance(c, RGB);
      if (dist < shortestDist) {
        shortestDist = dist;
        colorNum = i;
      }
    });
    return colorNum;
  },

  /**
   * Converts a hex color string (e.g. "#ff00ff") to the closest matching color index.
   * @param {string} hex - Hex color string.
   * @returns {number} Closest matching color index.
   */
  convertHex: function (hex) {
    const hexToRgb = function (hex) {
      if (hex[0] === "#") {
        hex = hex.slice(1);
      }
      let rgb = hex.match(/.{1,2}/g);
      return {
        r: parseInt(rgb[0], 16),
        g: parseInt(rgb[1], 16),
        b: parseInt(rgb[2], 16),
      };
    };
    return this.convertRGB(hexToRgb(hex));
  },

  /**
   * Converts raw image pixel data into the grid by averaging colors over each grid cell.
   * Supports "RGBA" (default), "RGB", and "ABGR" formats.
   * @param {Uint8ClampedArray|number[]} imageData - Raw pixel data array.
   * @param {number} width - Width of the source image.
   * @param {number} height - Height of the source image.
   * @param {string} [colorType="RGBA"] - Pixel format: "RGBA", "RGB", or "ABGR".
   */
  convertImage: function (imageData, width, height, colorType = "RGBA") {
    if (!this.gridInited) {
      this.init();
    }

    // Calculate pixels per grid cell
    const pxPerCellX = width / this.gridCols;
    const pxPerCellY = height / this.gridRows;

    for (let gridX = 0; gridX < this.gridCols; gridX++) {
      for (let gridY = 0; gridY < this.gridRows; gridY++) {
        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;

        // Determine pixel range in the original image corresponding to this grid cell
        const startX = Math.floor(gridX * pxPerCellX);
        const endX = Math.min(Math.floor((gridX + 1) * pxPerCellX), width);
        const startY = Math.floor(gridY * pxPerCellY);
        const endY = Math.min(Math.floor((gridY + 1) * pxPerCellY), height);

        for (let px = startX; px < endX; px++) {
          for (let py = startY; py < endY; py++) {
            let idx = 0;
            if (colorType === "RGBA") {
              idx = (py * width + px) * 4;
              rSum += imageData[idx];
              gSum += imageData[idx + 1];
              bSum += imageData[idx + 2];
            } else if (colorType === "RGB") {
              idx = (py * width + px) * 3;
              rSum += imageData[idx];
              gSum += imageData[idx + 1];
              bSum += imageData[idx + 2];
            } else if (colorType === "ABGR") {
              idx = (py * width + px) * 4;
              bSum += imageData[idx];
              gSum += imageData[idx + 1];
              rSum += imageData[idx + 2];
            }
            count++;
          }
        }

        // Average color of the cell
        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        // Convert average RGB to closest grid color index
        const colorIndex = this.convertRGB({ r: avgR, g: avgG, b: avgB });
        this.grid[gridX][gridY] = colorIndex;
      }
    }
  },
};

export default antGen;