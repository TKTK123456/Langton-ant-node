#!/usr/bin/env node
import { quickCalibration, TspCalibrator } from './calibrate.js';
import { AutoCalibrator } from './auto-calibrate.js'
console.log('TSP Calibration Tool');
console.log('===================\n');

const args = process.argv.slice(2);
if (args[0] == '--quick') {
    console.log('Running quick calibration...');
    quickCalibration();
} else if (args[0] == '--custom') {
    // Custom calibration with specific test sizes
    const calibrator = new TspCalibrator();
    
    async function customCalibration(testSizes = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500]) {
        console.log('Running custom calibration...\n');
        
        for (const size of testSizes) {
            await calibrator.runCalibrationTest(size, 2); // 2 iterations for speed
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        calibrator.calculateOptimalConstants();
        calibrator.generateReport();
        
        console.log('\n=== OPTIMIZED FUNCTION ===');
        console.log(calibrator.generateOptimizedFunction());
    }
    // Check if test sizes are provided as argument and are vailid array of numbers
    if (args[1] && Array.isArray(JSON.parse(args[1]))) {
    customCalibration(JSON.parse(args[1]));
    } else {
        customCalibration();
    }
} else if (args[0] == '--auto') {
    const autoCalibrator = new AutoCalibrator();
    autoCalibrator.createBackup();
    autoCalibrator.calibrateAndUpdate();
} else {
    console.log('Usage:');
    console.log('  calibrate --quick     # Run quick calibration');
    console.log('  calibrate --custom    # Run comprehensive calibration');
    console.log('  calibrate --custom [array]    # Run custom calibration with specific test sizes');
    console.log('  calibrate --auto    # Automatically calibrate and update index.js');
    console.log('\nThis will measure actual TSP performance on your system');
    console.log('and suggest optimized constants for the estimateTsp2OptTime function.');
}
