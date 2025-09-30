// Test script to verify the complete profile setup flow
const testCompleteFlow = async () => {
  const walletAddress = "0xCf4363d84f4A48486dD414011aB71ee7811eDD55";
  
  try {
    console.log("Testing complete profile setup flow...");
    
    // Test 1: Create a seller profile through the frontend API route
    console.log("\n1. Creating seller profile...");
    const createResponse = await fetch("http://localhost:3000/api/marketplace/seller/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        displayName: "Complete Flow Test User",
        storeName: "Complete Flow Test Store",
        bio: "This is a complete flow test bio",
        description: "This is a complete flow test description",
        coverImage: "https://example.com/cover.jpg",
        logo: "https://example.com/logo.jpg"
      }),
    });
    
    console.log("Create response status:", createResponse.status);
    const createResult = await createResponse.json();
    console.log("Create profile result:", createResult.success ? "SUCCESS" : "FAILED");
    
    if (!createResult.success) {
      console.error("Failed to create profile:", createResult.error);
      return;
    }
    
    // Test 2: Fetch the created profile
    console.log("\n2. Fetching seller profile...");
    const fetchResponse = await fetch(`http://localhost:3000/api/sellers/profile/${walletAddress}`);
    const fetchResult = await fetchResponse.json();
    console.log("Fetch profile result:", fetchResult.success ? "SUCCESS" : "FAILED");
    
    if (!fetchResult.success) {
      console.error("Failed to fetch profile:", fetchResult.error);
      return;
    }
    
    console.log("Profile data:", {
      displayName: fetchResult.data.displayName,
      storeName: fetchResult.data.storeName,
      bio: fetchResult.data.bio,
      description: fetchResult.data.description
    });
    
    // Test 3: Update the profile
    console.log("\n3. Updating seller profile...");
    const updateResponse = await fetch(`http://localhost:3000/api/sellers/profile/${walletAddress}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bio: "Updated bio from complete flow test",
        description: "Updated description from complete flow test"
      }),
    });
    
    const updateResult = await updateResponse.json();
    console.log("Update profile result:", updateResult.success ? "SUCCESS" : "FAILED");
    
    if (!updateResult.success) {
      console.error("Failed to update profile:", updateResult.error);
      return;
    }
    
    // Test 4: Fetch updated profile
    console.log("\n4. Fetching updated profile...");
    const fetchUpdatedResponse = await fetch(`http://localhost:3000/api/sellers/profile/${walletAddress}`);
    const fetchUpdatedResult = await fetchUpdatedResponse.json();
    console.log("Fetch updated profile result:", fetchUpdatedResult.success ? "SUCCESS" : "FAILED");
    
    if (!fetchUpdatedResult.success) {
      console.error("Failed to fetch updated profile:", fetchUpdatedResult.error);
      return;
    }
    
    console.log("Updated profile data:", {
      displayName: fetchUpdatedResult.data.displayName,
      storeName: fetchUpdatedResult.data.storeName,
      bio: fetchUpdatedResult.data.bio,
      description: fetchUpdatedResult.data.description
    });
    
    console.log("\n✅ All tests passed! The profile setup flow is working correctly.");
    
  } catch (error) {
    console.error("Error during complete flow test:", error);
  }
};

testCompleteFlow();