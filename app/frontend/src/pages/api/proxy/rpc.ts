import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only allow POST requests (RPC is always POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { target } = req.query;

    if (!target || typeof target !== 'string') {
        return res.status(400).json({ error: 'Missing target URL' });
    }

    try {
        // Ensure fetch is available
        if (!global.fetch) {
            console.error('RPC Proxy: fetch is not defined');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const response = await fetch(target, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body),
        });

        if (!response.ok) {
            console.warn(`RPC Proxy: Target returned ${response.status} ${response.statusText}`);
            // Forward the error status but try to parse body if possible
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                return res.status(response.status).json(errorJson);
            } catch (e) {
                return res.status(response.status).json({ error: `Upstream error: ${response.statusText}`, details: errorText });
            }
        }

        const data = await response.json();
        return res.status(200).json(data);
    } catch (error: any) {
        console.error('RPC Proxy Error:', error.message);
        return res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
}
