// This is older before migrating all the data to trainheroic.
// Still need to migrate 2021 data to trainheroic, like barbell logic
import { promises, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { authenticate } from '@google-cloud/local-auth';
import type { AuthClient, OAuth2Client } from 'google-auth-library';
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth';
import { google } from 'googleapis';
import { runCLI } from '../utils/cli';
import { logger } from '../utils/logger';
import { convertObjectToCsvString, parseCsv } from './csv';
import { loadSheet } from './parser';
import type { CsvRow } from './types';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = join(__dirname, 'token.json');
const CREDENTIALS_PATH = join(__dirname, './', 'creds.json');

const loadSavedCredentialsIfExist = async (): Promise<JSONClient | null> => {
    try {
        const content = await promises.readFile(TOKEN_PATH, 'utf-8');
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (_err) {
        return null;
    }
};

const saveCredentials = async (client: AuthClient) => {
    const jsonData = await promises.readFile(CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(jsonData);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    writeFileSync(TOKEN_PATH, payload, {
        flag: 'w',
    });
};

const authorize = async (): Promise<OAuth2Client> => {
    const savedClient: AuthClient | null = await loadSavedCredentialsIfExist();
    if (savedClient) return savedClient as JSONClient as OAuth2Client; // this is the only TS hack.

    const client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    // @ts-expect-error Legacy type mismatch
    if (client.credentials) await saveCredentials(client);

    // @ts-expect-error Legacy type mismatch in google-auth-library
    return client;
};

const getLeeftLog = async (auth: OAuth2Client): Promise<CsvRow[]> => {
    const sheets = google.sheets({ auth, version: 'v4' });
    const spreadsheetId = '1ds9mP8yrqPYVYmPufjvpIe7vk7WI9L3HdV2pFfq0baE';
    const gid = '642929285';

    const response = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId,
    });

    // Find the sheet with matching gid
    if (!response.data.sheets) throw new Error('No sheets found in the spreadsheet');

    const sheet = response.data.sheets.find((s) => s.properties?.sheetId?.toString() === gid);

    if (!sheet) {
        throw new Error(`Sheet with GID "${gid}" not found`);
    }

    const escapedSheetName = `'${sheet.properties?.title}'`;
    logger.processing(`${escapedSheetName}!A1:L9999`);
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${escapedSheetName}!A1:L9999`,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        logger.warning('No data found.');
        return [];
    }
    const len = rows[0].length;

    const padded = rows.map((r) => r.concat(Array(len - r.length).fill('')));
    const csvString = convertObjectToCsvString<string[]>(padded, true);
    return parseCsv(csvString);
};

const download = async () => {
    const client = await authorize();
    const rows = await getLeeftLog(client);
    const workouts = {
        workouts: loadSheet(rows),
    };
    writeFileSync(join(__dirname, '../', '../', 'data/', 'download', 'google', 'google-log.json'), JSON.stringify(workouts), {
        flag: 'w',
    });
    logger.processed('JSON generated');
};

const commands = {
    download,
};

runCLI({
    commands,
    usage: 'bun src/google/index.ts <command> [args...]',
    examples: ['bun src/google/index.ts download  # Download Google Sheets workout data'],
}).catch((err) => {
    logger.error('Error:');
    logger.error(err);
    process.exit(1);
});
