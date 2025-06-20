
import { quickCalibration, TspCalibrator } from './calibrate.js';

console.log('TSP Calibration Tool');
console.log('===================\n');

const args = process.argv.slice(2);

if (args.includes('--quick')) {
    console.log('Running quick calibration...');
    quickCalibration();
} else if (args.includes('--custom')) {
    // Custom calibration with specific test sizes
    const calibrator = new TspCalibrator();
    
    async function customCalibration() {
        console.log('Running custom calibration...\n');
        
        // Test with more comprehensive sizes
        const testSizes = [5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500];
        
        for (const size of testSizes) {
            await calibrator.runCalibrationTest(size, 2); // 2 iterations for speed
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        calibrator.calculateOptimalConstants();
        calibrator.generateReport();
        
        console.log('\n=== OPTIMIZED FUNCTION ===');
        console.log(calibrator.generateOptimizedFunction());
    }
    
    customCalibration();
} else {
    console.log('Usage:');
    console.log('  node test-calibration.js --quick     # Run quick calibration');
    console.log('  node test-calibration.js --custom    # Run comprehensive calibration');
    console.log('\nThis will measure actual TSP performance on your system');
    console.log('and suggest optimized constants for the estimateTsp2OptTime function.');
}
