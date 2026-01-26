#!/usr/bin/env bun

/**
 * Leeft GCS Upload Script
 * Compresses and uploads data files to Google Cloud Storage
 *
 * Usage:
 *   bun scripts/upload.ts [timestamp]
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';

const GCS_PATH = 'gs://typedef/leeft/';

// Get project root
const scriptDir = __dirname;
const projectRoot = dirname(scriptDir);

// Files to upload
const FILES_TO_UPLOAD = [
    'apps/data/data/out/lifting-log.json',
    'apps/data/data/out/cardio-log.json',
    'apps/data/data/out/cardio-log-strict.json',
    'apps/data/data/out/all-workouts-log.json',
    'apps/data/data/out/all-workouts-log-strict.json',
    'apps/data/data/out/cycles-lifting.json',
    'apps/data/data/out/cycles-all-workouts.json',
    'apps/data/data/exercise-classified.json',
];

function runCommand(command: string, args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
        const proc = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
        });

        proc.on('close', (code) => {
            resolve(code === 0);
        });

        proc.on('error', () => {
            resolve(false);
        });
    });
}

async function uploadCompressedLog(inputFile: string, timestamp: string): Promise<boolean> {
    const fullPath = join(projectRoot, inputFile);
    const baseName = basename(inputFile, '.json');
    const outputDir = dirname(fullPath);
    const compressedLog = `${baseName}_${timestamp}.json.gz`;
    const compressedPath = join(outputDir, compressedLog);

    // Check if input file exists
    if (!existsSync(fullPath)) {
        console.error(`Error: Input file '${inputFile}' not found`);
        return false;
    }

    console.log(`Compressing ${inputFile} to ${compressedLog}...`);

    // Compress the file
    const compressOk = await runCommand('gzip', ['-c', fullPath, '>', compressedPath]);
    if (!compressOk) {
        // Try with shell
        const shellOk = await runCommand('sh', ['-c', `gzip -c "${fullPath}" > "${compressedPath}"`]);
        if (!shellOk) {
            console.error('Error: Compression failed');
            return false;
        }
    }

    console.log('Uploading to Google Cloud Storage...');

    // Upload to GCS
    const uploadOk = await runCommand('gsutil', [
        '-h',
        'Content-Type:application/json',
        '-h',
        'Content-Encoding:gzip',
        'cp',
        compressedPath,
        `${GCS_PATH}${compressedLog}`,
    ]);

    // Clean up compressed file
    await runCommand('rm', ['-f', compressedPath]);

    if (uploadOk) {
        console.log(`Successfully uploaded to ${GCS_PATH}${compressedLog}`);
        return true;
    } else {
        console.error('Error: Upload failed');
        return false;
    }
}

async function main() {
    // Get timestamp from args or generate new one
    const timestamp =
        process.argv[2] ||
        new Date()
            .toISOString()
            .replace(/[-:]/g, '')
            .replace('T', '_')
            .slice(0, 15);

    console.log(`Using timestamp: ${timestamp}`);
    console.log('');

    let allSuccess = true;

    for (const file of FILES_TO_UPLOAD) {
        const success = await uploadCompressedLog(file, timestamp);
        if (!success) {
            allSuccess = false;
        }
    }

    // Update .env.local with timestamp
    const envPath = join(projectRoot, 'apps/web/.env.local');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const updatedContent = envContent.replace(/^NEXT_PUBLIC_TIMESTAMP=.*/m, `NEXT_PUBLIC_TIMESTAMP=${timestamp}`);

        if (updatedContent !== envContent) {
            writeFileSync(envPath, updatedContent);
            console.log(`Updated NEXT_PUBLIC_TIMESTAMP in ${envPath} to ${timestamp}`);
        }
    }

    console.log(timestamp);

    if (!allSuccess) {
        process.exit(1);
    }
}

main().catch((e) => {
    console.error('Error:', e);
    process.exit(1);
});
