#!/usr/bin/env node
import antGen from './index.js';
/**
 * Calibration system for estimateTsp2OptTime function
 * Measures actual performance and suggests timing constants
 */
class TspCalibrator {
    constructor(greedyConstant = 0.0001,twoOptConstant= 0.00001) {
        this.results = [];
        this.baselineConstants = {
            greedyConstant,
            twoOptConstant
        };
    }

    /**
     * Generate test points for calibration
     */
    generateTestPoints(numPoints, gridCols = 100, gridRows = 100) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            points.push({
                x: Math.floor(Math.random() * gridCols),
                y: Math.floor(Math.random() * gridRows)
            });
        }
        return points;
    }

    /**
     * Run a single calibration test
     */
    async runCalibrationTest(numPoints, iterations = 3) {
        console.log(`Testing with ${numPoints} points...`);
        
        const times = [];
        const greadyTimes = [];
        const twoOptTimes = [];
        for (let i = 0; i < iterations; i++) {
            // Setup antGen for testing
            antGen.gridCols = 100;
            antGen.gridRows = 100;
            antGen.init();
            
            const points = this.generateTestPoints(numPoints);
            const start = { x: 0, y: 0 };
            const end = { x: 99, y: 99 };
            
            // Measure actual performance
            const allInfo = antGen.tsp2Opt(points, start, end, true);
            const {path, calInfo} = allInfo;
            const {greedyTime, twoOptTime, totalTime} = calInfo;
            times.push(totalTime);
            greadyTimes.push(greedyTime);
            twoOptTimes.push(twoOptTime);
        }
        
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const avgGreedyTime = greadyTimes.reduce((a, b) => a + b, 0) / greadyTimes.length;
        const avgTwoOptTime = twoOptTimes.reduce((a, b) => a + b, 0) / twoOptTimes.length;
        const result = {
            numPoints,
            actualTime: avgTime,
            estimatedTime: antGen.estimateTsp2OptTime(numPoints).estimatedMs,
            greedyTime: avgGreedyTime,
            twoOptTime: avgTwoOptTime
        };
        
        this.results.push(result);
        console.log(`  Actual: ${avgTime.toFixed(2)}ms, Estimated: ${result.estimatedTime.toFixed(2)}ms`);
        
        return result;
    }

    /**
     * Run full calibration suite
     */
    async runCalibration(defaultMessage = true, testSizes = [10, 25, 50, 75, 100, 150, 200, 300]) {
        if (defaultMessage) console.log('Starting TSP calibration...\n');
        for (const size of testSizes) {
            await this.runCalibrationTest(size);
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.calculateOptimalConstants();
        this.generateReport();
    }

    /**
     * Calculate optimal constants based on measured data
     */
    calculateOptimalConstants() {
        if (this.results.length === 0) return;
        let sumActualGreedy = 0;
        let sumEstimatedGreedy = 0;
        let sumActualTwoOpt = 0;
        let sumEstimatedTwoOpt = 0;
        let count = 0;
        
        for (const result of this.results) {
            const n = result.numPoints;
            const actualTime = result.actualTime;
            const greedyTime = result.greedyTime;
            const twoOptTime = result.twoOptTime;
            const greedyComponent = n * n * this.baselineConstants.greedyConstant;
            const twoOptComponent = actualTime - greedyComponent;
            
            sumActualGreedy += greedyTime;
            sumEstimatedGreedy += greedyComponent;
            sumActualTwoOpt += twoOptTime;
            sumEstimatedTwoOpt += n * n * Math.min(n, 50) * this.baselineConstants.twoOptConstant;
            count++;
        }
        const greedyScale = count > 0 ? sumActualGreedy / sumEstimatedGreedy : 1;
        const twoOptScale = count > 0 ? sumActualTwoOpt / sumEstimatedTwoOpt : 1;
        
        this.optimizedConstants = {
            greedyConstant: this.baselineConstants.greedyConstant * greedyScale,
            twoOptConstant: this.baselineConstants.twoOptConstant * twoOptScale,
            greedyScale,
            twoOptScale
        };
    }

    /**
     * Generate calibration report
     */
    generateReport() {
        console.log('\n=== CALIBRATION REPORT ===\n');
        
        console.log('Test Results:');
        console.log('Points\tActual(ms)\tEstimated(ms)\tRatio');
        for (const result of this.results) {
            const ratio = (result.actualTime / result.estimatedTime).toFixed(2);
            console.log(`${result.numPoints}\t${result.actualTime.toFixed(2)}\t\t${result.estimatedTime.toFixed(2)}\t\t${ratio}`);
        }
        
        if (this.optimizedConstants) {
            console.log('\nOptimized Constants:');
            console.log(`Greedy constant: ${this.optimizedConstants.greedyConstant.toExponential(4)} (scale: ${this.optimizedConstants.greedyScale.toFixed(3)})`);
            console.log(`2-opt constant: ${this.optimizedConstants.twoOptConstant.toExponential(4)} (scale: ${this.optimizedConstants.twoOptScale.toFixed(3)})`);
            
            console.log('\nSuggested code update for index.js:');
            console.log(`Replace the constants in estimateTsp2OptTime with:`);
            console.log(`const greedyTime = numPoints * numPoints * ${this.optimizedConstants.greedyConstant.toExponential(4)};`);
            console.log(`const twoOptTime = numPoints * numPoints * iterations * ${this.optimizedConstants.twoOptConstant.toExponential(4)};`);
        }
        
        console.log('\nHardware Classification:');
        const avgRatio = this.results.reduce((sum, r) => sum + (r.actualTime / r.estimatedTime), 0) / this.results.length;
        
        if (avgRatio < 0.5) {
            console.log('High-performance system (much faster than baseline)');
        } else if (avgRatio < 1.5) {
            console.log('Standard performance system (close to baseline)');
        } else if (avgRatio < 3) {
            console.log('Lower performance system (slower than baseline)');
        } else {
            console.log('Very low performance system (much slower than baseline)');
        }
    }

    /**
     * Generate optimized estimateTsp2OptTime function
     */
    generateOptimizedFunction() {
        if (!this.optimizedConstants) {
            console.log('Run calibration first!');
            return;
        }
        
        const { greedyConstant, twoOptConstant } = this.optimizedConstants;
        
        return `
    /** Estimate tsp2Opt runtime based on number of points (calibrated) */
    estimateTsp2OptTime: function(numPoints) {
        // Calibrated constants for this system
        const greedyTime = numPoints * numPoints * ${greedyConstant.toExponential(4)};
        const iterations = Math.min(numPoints, 50);
        const twoOptTime = numPoints * numPoints * iterations * ${twoOptConstant.toExponential(4)};
        const totalTime = greedyTime + twoOptTime;

        return {
            estimatedMs: Math.round(totalTime * 100) / 100,
            greedyMs: Math.round(greedyTime * 100) / 100,
            twoOptMs: Math.round(twoOptTime * 100) / 100,
            iterations: iterations,
            complexity: numPoints < 100 ? 'Low' : numPoints < 500 ? 'Medium' : 'High'
        };
    }`;
    }
}

// Example usage and quick test
async function quickCalibration() {
    const calibrator = new TspCalibrator();
    
    console.log('Running quick calibration (this may take a moment)...\n');
    await calibrator.runCalibration();
    
    console.log('\n=== OPTIMIZED FUNCTION ===');
    console.log(calibrator.generateOptimizedFunction());
}

// Export for use
export { TspCalibrator, quickCalibration };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    quickCalibration().catch(console.error);
}
