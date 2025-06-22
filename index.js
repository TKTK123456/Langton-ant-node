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
    /**Looping edges*/
  looping: true,
     /**Stop after done drawing*/
  stopAfterDone: false,
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
  parseGrid: function(resetJson = true, detailTsp = false) {
      if (!this.gridInited) {
          this.init()
      }
      if (resetJson) {
          this.json = {};
          this.startState = 0;
      };
      let goToPoints = [];

      this.grid.forEach((col, x) => {
          col.forEach((val, y) => {
              if (val > 0) goToPoints.push({ x, y });
          });
      });

      let start = { x: this.startPos[0], y: this.startPos[1] };
      let end = { x: this.endPosDirc[0], y: this.endPosDirc[1] };
      let path = this.tsp2Opt(goToPoints, start, end, false, detailTsp);
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
      if (this.stopAfterDone) {
          this.json[this.startState-1][0].nextState = -1;
      }
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
      return this.convertRGB(hexToRgb(hex))
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
  },
    /** 2-opt TSP solver with fixed start and end points */
    tsp2Opt: function(points, start, end, calibrate = false, detailed = false) {
        let calInfo = {}
        if (calibrate) {
            calInfo.startTime = performance.now()
        }
        const dist = (a, b) => this.getDistAndDelta(a, b).dist;
        // Initial greedy path from start to end
        const middle = points.filter(p =>
            !(p.x === start.x && p.y === start.y) &&
            !(p.x === end.x && p.y === end.y)
        );
        const path = [start];
        let current = start;
        while (middle.length) {
            let bestIdx = -1;
            let bestDist = Infinity;
            for (let i = 0; i < middle.length; i++) {
                const d = dist(current, middle[i]);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            current = middle.splice(bestIdx, 1)[0];
            path.push(current);
        }
        path.push(end);
        if (calibrate) {
            calInfo.greedyTime = performance.now() - calInfo.startTime
        }
        const detailInfo = {}
        if (detailed) {
            detailInfo.getFullPath = (p) => {
                let fullPath = []
                for (let i = 0; i < p.length-1; i++) {
                    let pathXY = this.getPath(p[i], p[i+1]).pathXY;
                    fullPath.push(pathXY);
                }
            };
            detailInfo.currentFullPath = detailInfo.getFullPath(path);
            detailInfo.currentPath = path
        }
        let improved = true;
        while (improved) {
            improved = false;
            outer: for (let i = 1; i < path.length - 2; i++) {
                for (let k = i + 1; k < path.length - 1; k++) {
                    const a = path[i - 1], b = path[i];
                    const c = path[k], d = path[k + 1];
                    const before = dist(a, b) + dist(c, d);
                    const after = dist(a, c) + dist(b, d);
                    if (after < before) {
                        // Reverse the middle segment
                        for (let left = i, right = k; left < right; left++, right--) {
                            [path[left], path[right]] = [path[right], path[left]];
                        }
                        if (detailed) {
                            detailInfo.newFullPath = detailInfo.getFullPath(path);
                            if (detailInfo.newFullPath.length < detailInfo.currentFullPath.length) {
                                detailInfo.currentFullPath = detailInfo.newFullPath;
                                detailInfo.currentPath = path;
                                improved = true;
                                break outer;
                            } else {
                                path = detailInfo.currentPath;
                            }
                        } else {
                        improved = true;
                        break outer;
                        }
                    }
                }
            }
        }
        if (calibrate) {
            calInfo.twoOptTime = performance.now() - calInfo.startTime - calInfo.greedyTime
            calInfo.totalTime = performance.now() - calInfo.startTime
            return {path, calInfo}
        }
        return path;
    },
    /** Estimate tsp2Opt runtime based on number of points */
    estimateTsp2OptTime: function(numPoints, gridCols = this.gridCols, gridRows = this.gridRows ) {
        const iterations = Math.min(numPoints, 50);
        let greedyConstant = 0.0001;
        let twoOptConstant = 0.00001;
        const greedyTime = numPoints * numPoints * greedyConstant;
        const twoOptTime = numPoints * numPoints * iterations * twoOptConstant;
        const totalTime = greedyTime + twoOptTime;
        return {
            estimatedMs: Math.round(totalTime * 100) / 100,
            greedyMs: Math.round(greedyTime * 100) / 100,
            twoOptMs: Math.round(twoOptTime * 100) / 100,
            iterations: iterations,
            complexity: numPoints < 100 ? 'Low' : numPoints < 500 ? 'Medium' : 'High'
        };
    },
    /**Get path from one cordinate to another*/
    getPath: function(start, end, startState = this.startState) {
        const { dx, dy } = this.getDistAndDelta(start, end);
        let x = start.x;
        let y = start.y;
        let pathDir = [];
        let pathXY = [];
        let currentState = startState
        // Move in x direction first
        for (let step = 0; step < Math.abs(dx); step++) {
            const color = this.get({ x, y }); // Get color BEFORE move
            const state = startState;
            startState++;
            pathDir.push({
                state,
                color,
                move: dx > 0 ? ">" : "<",
                nextState: startState
            });
            pathXY.push({x,y});
            x = (x + (dx > 0 ? 1 : -1) + this.gridCols) % this.gridCols;
        }
        // Move in y direction
        for (let step = 0; step < Math.abs(dy); step++) {
            const color = this.get({
                x,
                y
            });
            const state = startState;
            startState++;
            pathDir.push({
                state,
                color,
                move: dy > 0 ? "v" : "^",
                nextState: startState
            });
            pathXY.push({x,y});
            y = (y + (dy > 0 ? 1 : -1) + this.gridRows) % this.gridRows;
        }
        const addToJson = (pathDir) => {
            for (let i = 0; i < startState-currentState; i++) {
                this.json[pathDir[i].state] = [{
                    writeColor: pathDir[i].color,
                    move: pathDir[i].move,
                    nextState: pathDir[i].nextState
                }]
                this.startState = pathDir[i].nextState
            }
        }
        return {pathDir, pathXY, addToJson, newStartState: startState}
    }
};
export default antGen;