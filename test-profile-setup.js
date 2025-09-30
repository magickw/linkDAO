// Test script to verify profile setup functionality
const testProfileSetup = async () => {
  const walletAddress = "0xCf4363d84f4A48486dD414011aB71ee7811eDD55";
  
  try {
    // Test creating a seller profile
    console.log("Testing profile creation...");
    const createResponse = await fetch("http://localhost:10000/marketplace/seller/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        displayName: "Test User",
        storeName: "Test Store",
        bio: "This is a test bio",
        description: "This is a test description"
      }),
    });
    
    const createResult = await createResponse.json();
    console.log("Create profile result:", createResult);
    
    if (!createResult.success) {
      console.error("Failed to create profile:", createResult.message);
      return;
    }
    
    console.log("Profile created successfully!");
    
    // Test fetching the seller profile
    console.log("\nTesting profile fetch...");
    const fetchResponse = await fetch(`http://localhost:10000/api/sellers/profile/${walletAddress}`);
    const fetchResult = await fetchResponse.json();
    console.log("Fetch profile result:", fetchResult);
    
    if (!fetchResult.success) {
      console.error("Failed to fetch profile:", fetchResult.message);
      return;
    }
    
    console.log("Profile fetched successfully!");
    console.log("Profile data:", fetchResult.data);
    
  } catch (error) {
    console.error("Error during test:", error);
  }
};

testProfileSetup();