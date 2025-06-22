function getRandomPoint(gridCols, gridRows) {
    return {
        x: Math.floor(Math.random() * gridCols),
        y: Math.floor(Math.random() * gridRows)
    }
};
function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
export { getRandomPoint, getRandom };