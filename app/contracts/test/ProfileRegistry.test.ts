import { expect } from "chai";
import { ethers } from "hardhat";

describe("ProfileRegistry", function () {
  it("Should create a profile", async function () {
    const ProfileRegistry = await ethers.getContractFactory("ProfileRegistry");
    const profileRegistry = await ProfileRegistry.deploy();
    await profileRegistry.deployed();

    const [owner] = await ethers.getSigners();
    
    await profileRegistry.createProfile(
      "testuser",
      "testuser.eth",
      "QmTestAvatar",
      "QmTestBio"
    );
    
    const profile = await profileRegistry.getProfileByAddress(owner.address);
    expect(profile.handle).to.equal("testuser");
    expect(profile.ens).to.equal("testuser.eth");
  });
});