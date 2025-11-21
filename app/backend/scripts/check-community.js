const { Client } = require('pg');
require('dotenv').config();

async function checkCommunity() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao",
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const communityId = '1174a923-f8a9-4898-9e66-375056794a0b';

        // Check communities table
        const res = await client.query('SELECT * FROM communities WHERE id = $1', [communityId]);
        console.log(`Community found in communities table: ${res.rows.length > 0}`);
        if (res.rows.length > 0) {
            console.log('Community data:', res.rows[0]);
        }

        // Check community_members table
        const membersRes = await client.query('SELECT * FROM community_members WHERE community_id = $1', [communityId]);
        console.log(`Members found for this community: ${membersRes.rows.length}`);
        if (membersRes.rows.length > 0) {
            console.log('First member:', membersRes.rows[0]);
        }

    } catch (err) {
        console.error('Error executing query', err.stack);
    } finally {
        await client.end();
    }
}

checkCommunity();
