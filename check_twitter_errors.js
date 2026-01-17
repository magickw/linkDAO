
const { db } = require('./app/backend/src/db');
const { socialMediaPosts } = require('./app/backend/src/db/schema');
const { desc, eq } = require('drizzle-orm');

async function checkTwitterErrors() {
  try {
    const results = await db
      .select()
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.platform, 'twitter'))
      .orderBy(desc(socialMediaPosts.createdAt))
      .limit(5);

    console.log('Recent Twitter post results:');
    results.forEach(r => {
      console.log(`- ID: ${r.id}, Status: ${r.postStatus}, Error: ${r.errorMessage}, Posted At: ${r.postedAt}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    process.exit();
  }
}

checkTwitterErrors();
