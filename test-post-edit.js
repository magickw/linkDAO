// Simple test script to verify post editing functionality
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

async function testPostEditing() {
  try {
    console.log('Testing post editing functionality...');
    
    // First, create a test post
    console.log('1. Creating a test post...');
    const createResponse = await fetch(`${BACKEND_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        author: '0x1234567890123456789012345678901234567890',
        title: 'Test Post for Editing',
        content: 'This is a test post that we will edit',
        dao: 'test-community',
        tags: ['test', 'edit']
      })
    });
    
    if (!createResponse.ok) {
      console.error('Failed to create post:', await createResponse.text());
      return;
    }
    
    const createdPost = await createResponse.json();
    const postId = createdPost.data.id;
    console.log('✅ Post created with ID:', postId);
    
    // Now, update the post
    console.log('2. Updating the post...');
    const updateResponse = await fetch(`${BACKEND_URL}/api/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Updated Test Post',
        content: 'This is the updated content of the test post',
        dao: 'updated-community',
        tags: ['test', 'updated', 'edit']
      })
    });
    
    if (!updateResponse.ok) {
      console.error('Failed to update post:', await updateResponse.text());
      return;
    }
    
    const updatedPost = await updateResponse.json();
    console.log('✅ Post updated successfully:', updatedPost.data);
    
    // Verify the update by fetching the post
    console.log('3. Verifying the update...');
    const getResponse = await fetch(`${BACKEND_URL}/api/posts/${postId}`);
    
    if (!getResponse.ok) {
      console.error('Failed to fetch post:', await getResponse.text());
      return;
    }
    
    const fetchedPost = await getResponse.json();
    console.log('✅ Post fetched successfully:', fetchedPost.data);
    
    // Check that the fields were updated correctly
    if (fetchedPost.data.title === 'Updated Test Post' && 
        fetchedPost.data.contentCid === 'This is the updated content of the test post' &&
        fetchedPost.data.dao === 'updated-community') {
      console.log('✅ All fields updated correctly');
    } else {
      console.error('❌ Fields were not updated correctly');
      console.log('Expected title: Updated Test Post, got:', fetchedPost.data.title);
      console.log('Expected content: This is the updated content of the test post, got:', fetchedPost.data.contentCid);
      console.log('Expected dao: updated-community, got:', fetchedPost.data.dao);
    }
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testPostEditing();