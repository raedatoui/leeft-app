#!/usr/bin/env bun

/**
 * Leeft Data Pipeline
 * Consolidated script for data sync and optional deployment
 *
 * Usage:
 *   bun scripts/pipeline.ts              - Full pipeline + deploy (default)
 *   bun scripts/pipeline.ts --sync-only  - Data sync only (no deploy)
 *   bun scripts/pipeline.ts --deploy     - Full pipeline + deploy (explicit)
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

// Parse arguments
const args = process.argv.slice(2);
const syncOnly = args.includes('--sync-only');
const deploy = !syncOnly;

// Colors for terminal output
const colors = {
    red: '\x1b[0;31m',
    green: '\x1b[0;32m',
    blue: '\x1b[0;34m',
    yellow: '\x1b[1;33m',
    reset: '\x1b[0m',
};

function log(msg: string) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    console.log(`${colors.blue}[${timestamp}]${colors.reset} ${msg}`);
}

function error(msg: string) {
    console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`);
}

function success(msg: string) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`);
}

function warn(msg: string) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`);
}

function validateDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

async function prompt(question: string): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function runStep(stepNum: number, totalSteps: number, description: string, command: string[], options?: { warn?: boolean; cwd?: string }) {
    log(`Step ${stepNum}/${totalSteps}: ${description}...`);

    return new Promise<boolean>((resolve) => {
        const proc = spawn(command[0], command.slice(1), {
            cwd: options?.cwd,
            stdio: 'inherit',
            shell: true,
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                if (options?.warn) {
                    warn(`${description} failed - continuing with remaining steps`);
                    resolve(true);
                } else {
                    error(`Failed: ${description}`);
                    resolve(false);
                }
            } else {
                success(description);
                resolve(true);
            }
        });

        proc.on('error', () => {
            if (options?.warn) {
                warn(`${description} failed - continuing with remaining steps`);
                resolve(true);
            } else {
                error(`Failed: ${description}`);
                resolve(false);
            }
        });
    });
}

async function main() {
    // Get project root (script is in scripts/)
    const scriptDir = __dirname;
    const projectRoot = dirname(scriptDir);
    const dataDir = join(projectRoot, 'apps/data');

    // Load environment variables
    const envPath = join(dataDir, '.env');

    let sessionToken = '';
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        const match = envContent.match(/^TRAINHEROIC_SESSION_TOKEN=(.+)$/m);
        if (match) sessionToken = match[1];
    }

    if (!sessionToken) {
        error('TRAINHEROIC_SESSION_TOKEN not set in apps/data/.env');
        process.exit(1);
    }

    // Display header
    console.log(`${colors.blue}Leeft Data Pipeline${colors.reset}`);
    console.log('====================');
    console.log(`Mode: ${deploy ? 'Full pipeline + deploy' : 'Sync only (no deploy)'}`);
    console.log('');
    console.log('Enter the date range for TrainHeroic data download:');
    console.log('');

    // Calculate defaults
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultStart = thirtyDaysAgo.toISOString().slice(0, 10);
    const defaultEnd = today.toISOString().slice(0, 10);

    // Prompt for dates
    let startDate = '';
    while (!startDate) {
        const input = await prompt(`Start date (YYYY-MM-DD) [default: ${defaultStart}]: `);
        const date = input || defaultStart;
        if (validateDate(date)) {
            startDate = date;
        } else {
            error('Invalid date format. Please use YYYY-MM-DD format.');
        }
    }

    let endDate = '';
    while (!endDate) {
        const input = await prompt(`End date (YYYY-MM-DD) [default: ${defaultEnd}]: `);
        const date = input || defaultEnd;
        if (validateDate(date)) {
            if (date >= startDate) {
                endDate = date;
            } else {
                error('End date must be on or after start date.');
            }
        } else {
            error('Invalid date format. Please use YYYY-MM-DD format.');
        }
    }

    console.log('');
    log(`Starting pipeline for date range: ${startDate} to ${endDate}`);
    console.log('');

    const totalSteps = deploy ? 10 : 8;

    // Run data pipeline steps
    const steps: Array<{ desc: string; cmd: string[]; warn?: boolean; cwd?: string }> = [
        { desc: 'Downloading TrainHeroic data', cmd: ['bun', 'trainheroic:download', `startDate=${startDate}&endDate=${endDate}`, sessionToken], cwd: dataDir },
        { desc: 'Compiling lifting data', cmd: ['bun', 'compile:lifting'], cwd: dataDir },
        { desc: 'Combining lifting data', cmd: ['bun', 'combine:lifting'], cwd: dataDir },
        { desc: 'Downloading Fitbit data', cmd: ['bun', 'fitbit:download'], cwd: dataDir, warn: true },
        { desc: 'Processing Fitbit data', cmd: ['bun', 'fitbit:process'], cwd: dataDir, warn: true },
        { desc: 'Compiling cardio data', cmd: ['bun', 'compile:cardio'], cwd: dataDir },
        { desc: 'Compiling all data', cmd: ['bun', 'compile:all'], cwd: dataDir },
        { desc: 'Combining all data', cmd: ['bun', 'combine:all'], cwd: dataDir },
    ];

    if (deploy) {
        steps.push({ desc: 'Uploading to Google Cloud Storage', cmd: ['./scripts/shell/upload.sh'], cwd: projectRoot });
        steps.push({ desc: 'Building and deploying to Firebase', cmd: ['pnpm', 'deploy:web'], cwd: projectRoot });
    }

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const ok = await runStep(i + 1, totalSteps, step.desc, step.cmd, { warn: step.warn, cwd: step.cwd });
        if (!ok) {
            process.exit(1);
        }
    }

    console.log('');
    success('Pipeline completed successfully!');
    log(`Data range processed: ${startDate} to ${endDate}`);
    if (deploy) {
        log('Deployed to Firebase');
    } else {
        log('Run with --deploy to upload and deploy');
    }
}

main().catch((e) => {
    error(e.message);
    process.exit(1);
});
