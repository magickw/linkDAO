// Test script to verify frontend service can communicate with backend
const testFrontendService = async () => {
  const walletAddress = "0xCf4363d84f4A48486dD414011aB71ee7811eDD55";
  
  try {
    // Test creating a seller profile through the frontend service endpoint
    console.log("Testing frontend service profile creation...");
    const createResponse = await fetch("http://localhost:3000/marketplace/seller/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        displayName: "Frontend Test User",
        storeName: "Frontend Test Store",
        bio: "This is a frontend test bio",
        description: "This is a frontend test description"
      }),
    });
    
    console.log("Create response status:", createResponse.status);
    const createResult = await createResponse.json();
    console.log("Create profile result:", createResult);
    
  } catch (error) {
    console.error("Error during frontend service test:", error);
  }
};

testFrontendService();