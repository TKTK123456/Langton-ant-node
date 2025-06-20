#!/usr/bin/env node
import fs from 'fs';
import { TspCalibrator } from './calibrate.js';

/**
 * Automatically calibrate and update the estimateTsp2OptTime function
 */
class AutoCalibrator {
    constructor() {
        this.calibrator = new TspCalibrator();
    }

    /**
     * Run calibration and update the index.js file
     */
    async calibrateAndUpdate() {
        console.log('Starting automatic calibration and update...\n');
        
        // Run calibration
        await this.calibrator.runCalibration();
        
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
            const indexPath = 'index.js';
            let content = fs.readFileSync(indexPath, 'utf8');
            
            const { greedyConstant, twoOptConstant } = this.calibrator.optimizedConstants;
            
            // Create the new function implementation
            const newFunction = `    /** Estimate tsp2Opt runtime based on number of points */
    estimateTsp2OptTime: function(numPoints) {
        // Calibrated constants for this system (auto-generated)
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

            // Find and replace the existing function
            const functionRegex = /\/\*\* Estimate tsp2Opt runtime[\s\S]*?estimatedMs:[\s\S]*?};[\s\S]*?}/;
            
            if (functionRegex.test(content)) {
                content = content.replace(functionRegex, newFunction);
                
                // Write back to file
                fs.writeFileSync(indexPath, content, 'utf8');
                
                console.log('\n✅ Successfully updated index.js with calibrated constants!');
                console.log(`Greedy constant: ${greedyConstant.toExponential(4)}`);
                console.log(`2-opt constant: ${twoOptConstant.toExponential(4)}`);
                
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
            const content = fs.readFileSync('index.js', 'utf8');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.writeFileSync(`index.js.backup.${timestamp}`, content, 'utf8');
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
