# antGen

`antGen` is a utility object designed for generating Langton's Ant rules compatible with the [EvolveCode turmite simulator](https://evolvecode.io/turmites/index.html). It provides tools to create grid-based color patterns, convert images to grid colors, and generate turmite JSON rule sets for simulating Langton’s Ant paths.

---

## Features

- Initialize and manage a toroidal (looping) grid.
- Set colors and fill areas on the grid.
- Convert images or hex/RGB colors to the closest predefined grid colors.
- Generate JSON state machines describing ant movement rules.
- Handle toroidal shortest path calculations.
- Compatible with EvolveCode turmite simulator rules format.

---

## Installation

```
npm install langton-ant-rule-gen
```
Common js
```js
const antGen = require('langton-ant-rule-gen');
```
ESM
```js
import antGen from 'langton-ant-rule-gen';
```
