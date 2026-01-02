import fs from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import qs from 'node:querystring';
import readline from 'node:readline/promises';
import dotenv from 'dotenv';
import open from 'open';
import { z } from 'zod';
import { logger } from '@leeft/utils';

dotenv.config();

const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID!;
const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET!;
const REDIRECT_URI = process.env.FITBIT_REDIRECT_URI!;

const SCOPES = ['activity', 'heartrate', 'sleep', 'profile'];

async function _loadUserId(accessToken: string): Promise<string> {
    // Fetch user profile to get user ID
    const userProfileResponse = await fetch('https://api.fitbit.com/1/user/-/profile.json', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!userProfileResponse.ok) {
        const errorData = await userProfileResponse.json();
        logger.error(`Failed to fetch user profile: ${JSON.stringify(errorData)}`);
        process.exit(1);
    }

    const userProfileData = z
        .object({
            user: z.object({
                encodedId: z.string(),
            }),
        })
        .parse(await userProfileResponse.json());

    const userId = userProfileData.user.encodedId;
    logger.info(`User ID: ${userId}`);
    return userId;
}

export async function main() {
    // Construct the authorization URL
    const authUrl = `https://www.fitbit.com/oauth2/authorize?${qs.stringify({
        response_type: 'code',
        client_id: FITBIT_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPES.join(' '),
    })}`;

    logger.info('Opening Fitbit OAuth URL in your browser...');
    logger.info(authUrl);
    await open(authUrl);

    // Prompt user to paste back the full redirect URL
    const rl = readline.createInterface({ input, output });
    const redirectUrl = await rl.question('\n🔐 Paste the full redirect URL here: ');
    rl.close();

    // Extract the code parameter
    const url = new URL(redirectUrl.trim());
    const code = url.searchParams.get('code');
    if (!code) {
        logger.error('No code found in the URL.');
        process.exit(1);
    }

    // Exchange code for tokens
    const body = qs.stringify({
        client_id: FITBIT_CLIENT_ID,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
    });

    const authHeader = Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://api.fitbit.com/oauth2/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });

    const data = z
        .object({
            access_token: z.string(),
            refresh_token: z.string(),
            expires_in: z.number(),
        })
        .parse(await response.json());

    if (!response.ok) {
        logger.error(`Token exchange failed: ${JSON.stringify(data)}`);
        process.exit(1);
    }

    // Success!
    logger.success('OAuth Success!');
    // Write credentials to a JSON file
    const credentials = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
    };

    fs.writeFileSync(`${__dirname}/creds.json`, JSON.stringify(credentials, null, 2));
    logger.saved('Credentials saved to creds.json');

    // Load user ID
    // await loadUserId();
}
