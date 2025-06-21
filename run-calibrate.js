#!/usr/bin/env node
import { quickCalibration, TspCalibrator } from './calibrate.js';
import { AutoCalibrator } from './auto-calibrate.js'
console.log('TSP Calibration Tool');
console.log('===================\n');

const args = process.argv.slice(2);
let calInputs = {
    debug: false,
    type: 'unknown',
    testSizes: [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500]
}
if (args.includes('--debug')) {
    calInputs.debug = true;
    console.log('Debug mode enabled');
}
if (args.includes('--quick')) {
    calInputs.type = "quick";
} else if (args.includes('--custom')) {
    calInputs.type = "custom";
    let testSizeIndex = args.indexOf('--custom') + 1;
    if (testSizeIndex < args.length && Array.isArray(JSON.parse(args[testSizeIndex]))) {
        calInputs.testSizes = JSON.parse(args[testSizeIndex]);
    }
} else if (args.includes('--auto')) {
    calInputs.type = "auto";
    let testSizeIndex = args.indexOf('--auto') + 1;
    if (testSizeIndex < args.length && Array.isArray(JSON.parse(args[testSizeIndex]))) {
        calInputs.testSizes = JSON.parse(args[testSizeIndex]);
    }
    if (calInputs.debug) {
        console.log(`Auto calibration will not automatically update index.js in debug mode.`)
    }
}
if (calInputs.type == 'quick') {
    console.log('Running quick calibration...');
    quickCalibration(calInputs.debug);
} else if (calInputs.type == 'custom') {
    // Custom calibration with specific test sizes
    const calibrator = new TspCalibrator(calInputs.debug);
    
    async function customCalibration(testSizes = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500]) {
        console.log('Running custom calibration...\n');
        await calibrator.runCalibration(false, testSizes);
        console.log('\n=== OPTIMIZED FUNCTION ===');
        console.log(calibrator.generateOptimizedFunction());
    }
    customCalibration(calInputs.testSizes);
} else if (calInputs.type == 'auto') {
    const autoCalibrator = new AutoCalibrator(calInputs.debug);
    autoCalibrator.createBackup();
    autoCalibrator.calibrateAndUpdate(calInputs.testSizes);
} else {
    console.log('Usage:');
    console.log('  --quick     # Run quick calibration');
    console.log('  --custom    # Run comprehensive calibration');
    console.log('  --custom [array]    # Run custom calibration with specific test sizes');
    console.log('  --auto    # Automatically calibrate and update index.js');
    console.log('  --auto [array]    # Automatically calibrate and update index.js with specific test sizes');
    console.log('  --debug    # Enable debug mode');
    console.log('    Debug mode will give more information about the calibration process.')
    console.log('    Debug mode will not automatically update index.js in auto mode.')
    console.log('\nThis will measure actual TSP performance on your system');
    console.log('and suggest optimized constants for the estimateTsp2OptTime function.');
}
