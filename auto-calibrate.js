#!/usr/bin/env node
import fs from 'fs';
import { TspCalibrator } from './calibrate.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Automatically calibrate and update the estimateTsp2OptTime function
 */
class AutoCalibrator {
    constructor(debug = false) {
        this.calibrator = new TspCalibrator(debug);
    }
    /**
     * Run calibration and update the index.js file
     */
    async calibrateAndUpdate(testSizes = [10, 25, 50, 75, 100, 150, 200, 300]) {
        console.log('Starting automatic calibration and update...\n');
        async function currentIndexConstants() {
            try {
                const indexPath = join(__dirname, 'index.js');
                const content = fs.readFileSync(indexPath, 'utf8');
                //console.log(content)
                let greedyConstant = content.match(/greedyTime \= numPoints \* numPoints \* [0-9]*\.[0-9]*e?-?[0-9]*/g)[0];
                let twoOptConstant = content.match(/twoOptTime \= numPoints \* numPoints \* iterations \* [0-9]*\.[0-9]*e?-?[0-9]*/g)[0];
                greedyConstant = greedyConstant.split('* ')[2];
                twoOptConstant = twoOptConstant.split('* ')[3];
                return { greedyConstant: parseFloat(greedyConstant), twoOptConstant: parseFloat(twoOptConstant) };
            } catch (error) {
                console.error('Error reading index.js:', error.message);
            }
        };
        const { greedyConstant, twoOptConstant } = await currentIndexConstants();
        this.calibrator.baselineConstants = { greedyConstant, twoOptConstant };
        // Run calibration
        await this.calibrator.runCalibration(true, testSizes);

        if (!this.calibrator.optimizedConstants) {
            console.error('Calibration failed - no optimized constants generated');
            return false;
        }

        // Update the index.js file
        return this.updateIndexFile();
    }

    /**
     * Update the estimateTsp2OptTime function in index.js
     */
    updateIndexFile() {
        try {
            const indexPath = join(__dirname, 'index.js');
            let content = fs.readFileSync(indexPath, 'utf8');

            const { greedyConstant, twoOptConstant } = this.calibrator.optimizedConstants;
            const functionRegex = /\/\*\* Estimate tsp2Opt runtime[\s\S]*?estimatedMs:[\s\S]*?};[\s\S]*?}/;
            let newFunction = content.match(functionRegex)[0];
            newFunction = newFunction.replace(/greedyTime \= numPoints \* numPoints \* [0-9]*\.[0-9]*e?-?[0-9]*/g, `greedyTime = numPoints * numPoints * ${greedyConstant.toExponential(4)}`);
            newFunction = newFunction.replace(/twoOptTime \= numPoints \* numPoints \* iterations \* [0-9]*\.[0-9]*e?-?[0-9]*/g, `twoOptTime = numPoints * numPoints * iterations * ${twoOptConstant.toExponential(4)}`);
            if (functionRegex.test(content)) {
                content = content.replace(functionRegex, newFunction);
                
                // Write back to file
                if (!this.calibrator.debug) {
                    fs.writeFileSync(indexPath, content, 'utf8');

                    console.log('\n✅ Successfully updated index.js with calibrated constants!');
                    console.log(`Greedy constant: ${greedyConstant.toExponential(4)}`);
                    console.log(`2-opt constant: ${twoOptConstant.toExponential(4)}`);
                } else {
                    console.log('\n=== UPDATED FUNCTION ===');
                    console.log(newFunction);
                }
                return true;
            } else {
                console.error('❌ Could not find estimateTsp2OptTime function in index.js');
                return false;
            }

        } catch (error) {
            console.error('❌ Error updating index.js:', error.message);
            return false;
        }
    }

    /**
     * Create a backup of the original index.js
     */
    createBackup() {
        try {
            const indexPath = join(__dirname, 'index.js');
            const content = fs.readFileSync(indexPath, 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = join(__dirname, `index.js.backup.${timestamp}`)
            if (!this.calibrator.debug) fs.writeFileSync(backupPath, content, 'utf8');
            console.log(`Backup created: index.js.backup.${timestamp}`);
        } catch (error) {
            console.error('Warning: Could not create backup:', error.message);
        }
    }
}

// Main execution
async function main() {
    const autoCalibrator = new AutoCalibrator();

    // Create backup first
    autoCalibrator.createBackup();

    // Run calibration and update
    const success = await autoCalibrator.calibrateAndUpdate();

    if (success) {
        console.log('\n🎉 Auto-calibration complete!');
        console.log('Your estimateTsp2OptTime function has been optimized for this system.');
    } else {
        console.log('\n❌ Auto-calibration failed. Check the errors above.');
    }
}

// Export for programmatic use
export { AutoCalibrator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}