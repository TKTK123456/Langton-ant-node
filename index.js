/** antGen is a utility object designed for generating Langton's Ant rules compatible with the EvolveCode turmite simulator. It provides tools to create grid-based color patterns, convert images to grid colors, and generate turmite JSON rule sets for simulating Langton’s Ant paths */
const antGen = {
/** This is to set the scale */
  scale: 8,
/** This is to set the width of the canvas*/
  width: 1366,
/** This is to set the height of the canvas*/
  height: 768,
    /**This is the amount of grid columns*/
  gridCols: 171,
    /**This is the amount of grid rows*/
  gridRows: 96,
    /**This is the starting position of the ant*/
  startPos: undefined,
    /**This is the ending position and direction of the ant*/
  endPosDirc: undefined,
    /**This is if the grid init() function has been called*/
  gridInited: false,
    /**This is the grid*/
  grid: [],
    /**This is if the grid is looping*/
  looping: true,
    /**This is to make sure that the input cordinates are within the grid*/
  checkCords: function({ x, y }) {
      if (!this.gridInited) {
          this.init()
      }
      if (this.looping) {
      x = ((x % this.gridCols) + this.gridCols) % this.gridCols;
      y = ((y % this.gridRows) + this.gridRows) % this.gridRows;
      } else {
          x = Math.max(0, Math.min(this.gridCols - 1, x));
          y = Math.max(0, Math.min(this.gridRows - 1, y));
      }
      return { x, y };
  },
    /**This is to get the value of a grid cell*/
  get: function(cords) {
      if (!this.gridInited) {
          this.init()
      }
      cords = this.checkCords(cords);
      return this.grid[cords.x][cords.y];
  },
    /**This is to set the value of a grid cell*/
  set: function(cords, value) {
      if (!this.gridInited) {
          this.init()
      }
      cords = this.checkCords(cords);
      this.grid[cords.x][cords.y] = value;
      return value;
  },
    /**This is the output json for the rules */
  json: {},
    /**This is the starting state of the ant*/
  startState: 0,
    /**This is to get the delta between two points*/
  getDelta: function(p1, p2, size) {
      let delta = (p2 - p1 + size) % size;
      if (delta > size / 2) delta -= size;
      return delta;
  },
    /**This is to get the distance and delta between two points*/
  getDistAndDelta: function(p1, p2) {
      if (!this.gridInited) {
          this.init()
      }
      if (this.looping) {
      const dx = this.getDelta(p1.x, p2.x, this.gridCols);
      const dy = this.getDelta(p1.y, p2.y, this.gridRows);
          
      return { dist: Math.abs(dx) + Math.abs(dy), dx, dy };
      } else {
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          return { dist: Math.abs(dx) + Math.abs(dy), dx, dy };
      }
  },
    /**This is to set the starting position and direction of the ant after it has finished the grid*/
  setStartLoc: function(x, y, direction = "right") {
      ({ x, y } = this.checkCords({ x, y }));
      if (x === this.endPosDirc[0] && y === this.endPosDirc[1] && direction === this.endPosDirc[2]) return;
      this.endPosDirc = [x, y, direction];
  },
    /**This is to fill an area with a color*/
  fillArea: function(x1, y1, x2, y2, color) {
      if (!this.gridInited) {
          this.init()
      }
      ({ x: x1, y: y1 } = this.checkCords({ x: x1, y: y1 }));
      ({
          x: x2,
          y: y2
      } = this.checkCords({ x: x2, y: y2 }));
      if (x1 > x2)[x1, x2] = [x2, x1];
      if (y1 > y2)[y1, y2] = [y2, y1];
      for (let i = x1; i <= x2; i++) {
          this.grid[i].fill(color, y1, y2 + 1);
      }
  },
    /**This is to parse the grid and generate the rules*/
  parseGrid: function() {
      if (!this.gridInited) {
          this.init()
      }
      let shortestPath = [];
      let goToPoints = [];

      this.grid.forEach((col, x) => {
          col.forEach((val, y) => {
              if (val > 0) goToPoints.push({ x, y });
          });
      });

      let path = [{ x: this.startPos[0], y: this.startPos[1] }];
      let unvisited = goToPoints.slice();
      if (unvisited.some(e => e.x == this.startPos[0] && e.y == this.startPos[1])) unvisited.splice(unvisited.findIndex(e => e.x == this.startPos[0] && e.y == this.startPos[1]), 1)
      while (unvisited.length > 0) {
          let current = path[path.length - 1];
          let closestIdx = 0;
          let shortestDist = this.getDistAndDelta(current, unvisited[0]).dist;

          for (let i = 1; i < unvisited.length; i++) {
              let { dist } = this.getDistAndDelta(current, unvisited[i]);
              if (dist < shortestDist) {
                  shortestDist = dist;
                  closestIdx = i;
              }
          }
          const [nextPoint] = unvisited.splice(closestIdx, 1);
          path.push(nextPoint);
      }

      path.push({ x: this.endPosDirc[0], y: this.endPosDirc[1] });
      // Generate moves same as before
      for (let i = 0; i < path.length - 1; i++) {
          const start = path[i];
          const end = path[i + 1];
          const { dx, dy } = this.getDistAndDelta(start, end);

          let x = start.x;
          let y = start.y;

          // Move in x direction first
          for (let step = 0; step < Math.abs(dx); step++) {
              const color = this.get({ x, y }); // Get color BEFORE move
              const state = this.startState;
              this.startState++;
              this.json[state] = [{
                  writeColor: color,
                  move: dx > 0 ? ">" : "<",
                  nextState: this.startState
              }];

              x = (x + (dx > 0 ? 1 : -1) + this.gridCols) % this.gridCols;
          }

          // Move in y direction
          for (let step = 0; step < Math.abs(dy); step++) {
              const color = this.get({
                  x,
                  y
              });
              const state = this.startState;
              this.startState++;
              this.json[state] = [{
                  writeColor: color,
                  move: dy > 0 ? "v" : "^",
                  nextState: this.startState
              }];

              y = (y + (dy > 0 ? 1 : -1) + this.gridRows) % this.gridRows;
          }
      }
      const addFinalMoves = (moves) => {
          moves.forEach(([move, dx, dy]) => {
              const pos = this.checkCords({ x: this.endPosDirc[0] + dx, y: this.endPosDirc[1] + dy });
              const color = this.get(pos);
              const state = this.startState;
              this.startState++;
              this.json[state] = [{
                  writeColor: color,
                  move,
                  nextState: this.startState
              }];
          });
      };

      const directions = {
          right: [
              ["<", 0, 0],
              [">", -1, 0]
          ],
          left: [
              [">", 0, 0],
              ["<", 1, 0]
          ],
          up: [
              ["v", 0, 0],
              ["^", 0, 1]
          ],
          down: [
              ["^", 0, 0],
              ["v", 0, -1]
          ],
      };

      addFinalMoves(directions[this.endPosDirc[2]]);
  },
    /**This is to add a move rule to the json*/
  addMoveRule: function(state, writeColor, move, nextState) {
      state += this.startState;
      nextState = (nextState !== undefined) ? nextState + this.startState : state;
      if (!this.json[state]) this.json[state] = [];
      this.json[state].push({
          writeColor,
          move,
          nextState
      });
  },
    /**This is to initialize the grid or to reset it*/
  init: function() {
      this.gridCols = Math.ceil(this.width / this.scale);
      this.gridRows = Math.ceil(this.height / this.scale);
      this.startPos = [Math.floor(this.gridCols / 2), Math.floor(this.gridRows / 2)];
      this.endPosDirc = [Math.floor(this.gridCols / 2), Math.floor(this.gridRows / 2), 'right'];
      this.grid = Array(this.gridCols).fill(null).map(() => Array(this.gridRows).fill(0));
      this.gridInited = true;
  },
    /**This is all the colors that the grid can use */
  colors: [{ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 255, g: 0, b: 255 }, { r: 255, g: 255, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 255, b: 255 }, { r: 255, g: 0, b: 0 }, { r: 255, g: 165, b: 0 }, { r: 0, g: 0, b: 255 }, { r: 255, g: 105, b: 180 }, { r: 218, g: 112, b: 214 }, { r: 138, g: 43, b: 226 }],
    /**This is to convert a RGB color to a color number*/
  convertRGB: function(RGB) {
      const colorDistance = (color1, color2) => {
          const { r: r1, g: g1, b: b1 } = color1;
          const { r: r2, g: g2, b: b2 } = color2;
          return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
      }
      let shortestDist = Infinity;
      let colorNum = null;
      this.colors.forEach((c, i) => {
          const dist = colorDistance(c, RGB)
          if (dist < shortestDist) {
              shortestDist = dist;
              colorNum = i;
          }
      })
      return colorNum;
  },
    /**This is to convert a hex color to a color number*/
  convertHex: function(hex) {
      const hexToRgb = function(hex) {
          if (hex[0] == '#') {
              hex = hex.slice(1);
          }
          let rgb = hex.split(/..?/g)
          rgb = { r: parseInt(rgb[0], 16), g: parseInt(rgb[1], 16), b: parseInt(rgb[2], 16) }
          return rgb;
      };
      return convertRGB(hexToRgb(hex))
  },
    /**This is to convert an image to the grid*/
  convertImage: function(imageData, width, height, colorType = "RGBA") {
      if (!this.gridInited) {
          this.init()
      }
      let scaleW = width / this.gridCols;
      let scaleH = height / this.gridRows;
      for (let gridY = 0; gridY < this.gridRows; gridY++) {
          for (let gridX = 0; gridX < this.gridCols; gridX++) {
              let startX = Math.floor(gridX * scaleW);
              let endX = Math.min(Math.floor((gridX + 1) * scaleW), width);
              let startY = Math.floor(gridY * scaleH);
              let endY = Math.min(Math.floor((gridY + 1) * scaleH), height);
              let rgb = { r: 0, g: 0, b: 0 };
              let count = 0;
              for (let y = startY; y < endY; y++) {
                  for (let x = startX; x < endX; x++) {
                      if (colorType == 'RGBA') {
                      const index = (y * width + x) * 4;
                      rgb.r += imageData[index];
                      rgb.g += imageData[index + 1];
                      rgb.b += imageData[index + 2];
                      } else if (colorType == 'RGB') {
                          const index = (y * width + x) * 3;
                          rgb.r += imageData[index];
                          rgb.g += imageData[index + 1];
                          rgb.b += imageData[index + 2];
                      } else if (colorType == 'ABGR') {
                          const index = (y * width + x) * 4;
                          rgb.r += imageData[index + 3];
                          rgb.g += imageData[index + 2];
                          rgb.b += imageData[index+1];
                      }
                      count++;
                  }
              }
              if (count > 0) {
                  rgb.r = Math.round(rgb.r / count);
                  rgb.g = Math.round(rgb.g / count);
                  rgb.b = Math.round(rgb.b / count);
              }
              let colorIndex = this.convertRGB(rgb);
              this.set({ x: gridX, y: gridY }, colorIndex);
          };
      };
  }
};
export default antGen;