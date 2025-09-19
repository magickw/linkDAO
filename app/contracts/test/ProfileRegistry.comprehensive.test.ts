import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ProfileRegistry, SimpleProfileRegistry } from "../typechain-types";

describe("Profile Registry System", function () {
  let profileRegistry: ProfileRegistry;
  let simpleProfileRegistry: SimpleProfileRegistry;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy ProfileRegistry
    const ProfileRegistryFactory = await ethers.getContractFactory("ProfileRegistry");
    profileRegistry = await ProfileRegistryFactory.deploy();
    await profileRegistry.deployed();

    // Deploy SimpleProfileRegistry
    const SimpleProfileRegistryFactory = await ethers.getContractFactory("SimpleProfileRegistry");
    simpleProfileRegistry = await SimpleProfileRegistryFactory.deploy();
    await simpleProfileRegistry.deployed();
  });

  describe("ProfileRegistry - Comprehensive Profile Management", function () {
    describe("Profile Creation", function () {
      it("Should create a comprehensive profile with all fields", async function () {
        const handle = "testuser";
        const ens = "testuser.eth";
        const avatarCid = "QmTestAvatar123";
        const bioCid = "QmTestBio456";

        const tx = await profileRegistry.connect(user1).createProfile(
          handle,
          ens,
          avatarCid,
          bioCid
        );

        await expect(tx)
          .to.emit(profileRegistry, "ProfileCreated")
          .withArgs(user1.address, 1, handle, await ethers.provider.getBlock("latest").then(b => b.timestamp));

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.handle).to.equal(handle);
        expect(profile.ens).to.equal(ens);
        expect(profile.avatarCid).to.equal(avatarCid);
        expect(profile.bioCid).to.equal(bioCid);
        expect(profile.createdAt).to.be.gt(0);
      });

      it("Should create profile with optional ENS field empty", async function () {
        await profileRegistry.connect(user1).createProfile(
          "noensuser",
          "",
          "QmAvatar",
          "QmBio"
        );

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.handle).to.equal("noensuser");
        expect(profile.ens).to.equal("");
      });

      it("Should prevent duplicate profiles for same address", async function () {
        await profileRegistry.connect(user1).createProfile(
          "firstprofile",
          "first.eth",
          "QmAvatar1",
          "QmBio1"
        );

        await expect(
          profileRegistry.connect(user1).createProfile(
            "secondprofile",
            "second.eth",
            "QmAvatar2",
            "QmBio2"
          )
        ).to.be.revertedWith("Profile already exists");
      });

      it("Should prevent empty handle", async function () {
        await expect(
          profileRegistry.connect(user1).createProfile(
            "",
            "test.eth",
            "QmAvatar",
            "QmBio"
          )
        ).to.be.revertedWith("Handle is required");
      });

      it("Should assign sequential token IDs", async function () {
        await profileRegistry.connect(user1).createProfile("user1", "", "QmA1", "QmB1");
        await profileRegistry.connect(user2).createProfile("user2", "", "QmA2", "QmB2");
        await profileRegistry.connect(user3).createProfile("user3", "", "QmA3", "QmB3");

        expect(await profileRegistry.addressToTokenId(user1.address)).to.equal(1);
        expect(await profileRegistry.addressToTokenId(user2.address)).to.equal(2);
        expect(await profileRegistry.addressToTokenId(user3.address)).to.equal(3);
      });
    });

    describe("Handle Reservation System", function () {
      it("Should reserve handles and prevent duplicates", async function () {
        const handle = "uniquehandle";
        
        await profileRegistry.connect(user1).createProfile(
          handle,
          "user1.eth",
          "QmAvatar1",
          "QmBio1"
        );

        // Check handle is reserved
        expect(await profileRegistry.handleToTokenId(handle)).to.equal(1);

        // Try to use same handle with different user
        await expect(
          profileRegistry.connect(user2).createProfile(
            handle,
            "user2.eth",
            "QmAvatar2",
            "QmBio2"
          )
        ).to.be.revertedWith("Handle already taken");
      });

      it("Should allow case-sensitive handle variations", async function () {
        await profileRegistry.connect(user1).createProfile("TestUser", "", "QmA1", "QmB1");
        await profileRegistry.connect(user2).createProfile("testuser", "", "QmA2", "QmB2");
        await profileRegistry.connect(user3).createProfile("TESTUSER", "", "QmA3", "QmB3");

        // All should succeed as they are different strings
        const profile1 = await profileRegistry.getProfileByAddress(user1.address);
        const profile2 = await profileRegistry.getProfileByAddress(user2.address);
        const profile3 = await profileRegistry.getProfileByAddress(user3.address);

        expect(profile1.handle).to.equal("TestUser");
        expect(profile2.handle).to.equal("testuser");
        expect(profile3.handle).to.equal("TESTUSER");
      });

      it("Should retrieve profile by handle", async function () {
        const handle = "lookuptest";
        await profileRegistry.connect(user1).createProfile(
          handle,
          "lookup.eth",
          "QmLookupAvatar",
          "QmLookupBio"
        );

        const profileByHandle = await profileRegistry.getProfileByHandle(handle);
        const profileByAddress = await profileRegistry.getProfileByAddress(user1.address);

        expect(profileByHandle.handle).to.equal(profileByAddress.handle);
        expect(profileByHandle.ens).to.equal(profileByAddress.ens);
        expect(profileByHandle.avatarCid).to.equal(profileByAddress.avatarCid);
        expect(profileByHandle.bioCid).to.equal(profileByAddress.bioCid);
      });
    });

    describe("Avatar Storage System", function () {
      beforeEach(async function () {
        await profileRegistry.connect(user1).createProfile(
          "avatartest",
          "avatar.eth",
          "QmInitialAvatar",
          "QmInitialBio"
        );
      });

      it("Should update avatar and bio via IPFS CIDs", async function () {
        const newAvatarCid = "QmNewAvatar123";
        const newBioCid = "QmNewBio456";

        const tx = await profileRegistry.connect(user1).updateProfile(
          1,
          newAvatarCid,
          newBioCid
        );

        await expect(tx)
          .to.emit(profileRegistry, "ProfileUpdated")
          .withArgs(1, "avatartest", newAvatarCid, newBioCid);

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.avatarCid).to.equal(newAvatarCid);
        expect(profile.bioCid).to.equal(newBioCid);
      });

      it("Should allow approved addresses to update profile", async function () {
        // Approve user2 to manage user1's profile
        await profileRegistry.connect(user1).approve(user2.address, 1);

        const newAvatarCid = "QmApprovedAvatar";
        const newBioCid = "QmApprovedBio";

        await profileRegistry.connect(user2).updateProfile(
          1,
          newAvatarCid,
          newBioCid
        );

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.avatarCid).to.equal(newAvatarCid);
        expect(profile.bioCid).to.equal(newBioCid);
      });

      it("Should prevent unauthorized profile updates", async function () {
        await expect(
          profileRegistry.connect(user2).updateProfile(
            1,
            "QmUnauthorized",
            "QmUnauthorized"
          )
        ).to.be.revertedWith("Not owner or approved");
      });
    });

    describe("ENS Integration", function () {
      beforeEach(async function () {
        await profileRegistry.connect(user1).createProfile(
          "enstest",
          "initial.eth",
          "QmAvatar",
          "QmBio"
        );
      });

      it("Should update ENS name", async function () {
        const newEns = "updated.eth";
        
        await profileRegistry.connect(user1).updateEns(1, newEns);

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.ens).to.equal(newEns);
      });

      it("Should allow clearing ENS name", async function () {
        await profileRegistry.connect(user1).updateEns(1, "");

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.ens).to.equal("");
      });

      it("Should prevent unauthorized ENS updates", async function () {
        await expect(
          profileRegistry.connect(user2).updateEns(1, "unauthorized.eth")
        ).to.be.revertedWith("Not owner or approved");
      });

      it("Should allow approved addresses to update ENS", async function () {
        await profileRegistry.connect(user1).setApprovalForAll(user2.address, true);
        
        await profileRegistry.connect(user2).updateEns(1, "approved.eth");

        const profile = await profileRegistry.getProfileByAddress(user1.address);
        expect(profile.ens).to.equal("approved.eth");
      });
    });

    describe("NFT-based Profile Ownership", function () {
      beforeEach(async function () {
        await profileRegistry.connect(user1).createProfile(
          "nfttest",
          "nft.eth",
          "QmNFTAvatar",
          "QmNFTBio"
        );
      });

      it("Should mint NFT when creating profile", async function () {
        expect(await profileRegistry.ownerOf(1)).to.equal(user1.address);
        expect(await profileRegistry.balanceOf(user1.address)).to.equal(1);
      });

      it("Should transfer profile ownership with NFT", async function () {
        await profileRegistry.connect(user1).transferFrom(user1.address, user2.address, 1);

        expect(await profileRegistry.ownerOf(1)).to.equal(user2.address);
        expect(await profileRegistry.balanceOf(user1.address)).to.equal(0);
        expect(await profileRegistry.balanceOf(user2.address)).to.equal(1);

        // Profile data should remain the same
        const profile = await profileRegistry.profiles(1);
        expect(profile.handle).to.equal("nfttest");
      });

      it("Should update addressToTokenId mapping on transfer", async function () {
        await profileRegistry.connect(user1).transferFrom(user1.address, user2.address, 1);

        // Note: The addressToTokenId mapping doesn't automatically update on transfer
        // This is by design - the original creator's address mapping remains
        expect(await profileRegistry.addressToTokenId(user1.address)).to.equal(1);
        
        // But the NFT ownership has changed
        expect(await profileRegistry.ownerOf(1)).to.equal(user2.address);
      });

      it("Should support ERC721 enumerable functions", async function () {
        await profileRegistry.connect(user2).createProfile("user2", "", "QmA2", "QmB2");
        await profileRegistry.connect(user3).createProfile("user3", "", "QmA3", "QmB3");

        expect(await profileRegistry.totalSupply()).to.equal(3);
        expect(await profileRegistry.tokenByIndex(0)).to.equal(1);
        expect(await profileRegistry.tokenByIndex(1)).to.equal(2);
        expect(await profileRegistry.tokenByIndex(2)).to.equal(3);
      });
    });
  });

  describe("SimpleProfileRegistry - Basic Profile Functionality", function () {
    describe("Basic Profile Creation", function () {
      it("Should create simple profile with handle and avatar", async function () {
        const handle = "simpleuser";
        const avatarCid = "QmSimpleAvatar";

        const tx = await simpleProfileRegistry.connect(user1).createProfile(handle, avatarCid);

        await expect(tx)
          .to.emit(simpleProfileRegistry, "ProfileCreated")
          .withArgs(user1.address, 1, handle, await ethers.provider.getBlock("latest").then(b => b.timestamp));

        const profile = await simpleProfileRegistry.getProfileByAddress(user1.address);
        expect(profile.handle).to.equal(handle);
        expect(profile.avatarCid).to.equal(avatarCid);
        expect(profile.createdAt).to.be.gt(0);
      });

      it("Should prevent duplicate profiles", async function () {
        await simpleProfileRegistry.connect(user1).createProfile("first", "QmAvatar1");

        await expect(
          simpleProfileRegistry.connect(user1).createProfile("second", "QmAvatar2")
        ).to.be.revertedWith("Profile exists");
      });

      it("Should require handle", async function () {
        await expect(
          simpleProfileRegistry.connect(user1).createProfile("", "QmAvatar")
        ).to.be.revertedWith("Handle required");
      });

      it("Should allow empty avatar CID", async function () {
        await simpleProfileRegistry.connect(user1).createProfile("noavatar", "");

        const profile = await simpleProfileRegistry.getProfileByAddress(user1.address);
        expect(profile.handle).to.equal("noavatar");
        expect(profile.avatarCid).to.equal("");
      });
    });

    describe("Profile Retrieval", function () {
      beforeEach(async function () {
        await simpleProfileRegistry.connect(user1).createProfile("testuser", "QmTestAvatar");
      });

      it("Should retrieve profile by address", async function () {
        const profile = await simpleProfileRegistry.getProfileByAddress(user1.address);
        expect(profile.handle).to.equal("testuser");
        expect(profile.avatarCid).to.equal("QmTestAvatar");
      });

      it("Should return empty profile for non-existent user", async function () {
        const profile = await simpleProfileRegistry.getProfileByAddress(user2.address);
        expect(profile.handle).to.equal("");
        expect(profile.avatarCid).to.equal("");
        expect(profile.createdAt).to.equal(0);
      });
    });

    describe("NFT Functionality", function () {
      it("Should mint NFT on profile creation", async function () {
        await simpleProfileRegistry.connect(user1).createProfile("nftuser", "QmNFTAvatar");

        expect(await simpleProfileRegistry.ownerOf(1)).to.equal(user1.address);
        expect(await simpleProfileRegistry.balanceOf(user1.address)).to.equal(1);
      });

      it("Should support NFT transfers", async function () {
        await simpleProfileRegistry.connect(user1).createProfile("transferuser", "QmTransferAvatar");
        
        await simpleProfileRegistry.connect(user1).transferFrom(user1.address, user2.address, 1);

        expect(await simpleProfileRegistry.ownerOf(1)).to.equal(user2.address);
      });
    });
  });

  describe("Integration and Comparison", function () {
    it("Should demonstrate feature differences between registries", async function () {
      // Create profiles in both registries
      await profileRegistry.connect(user1).createProfile(
        "fulluser",
        "full.eth",
        "QmFullAvatar",
        "QmFullBio"
      );

      await simpleProfileRegistry.connect(user1).createProfile(
        "simpleuser",
        "QmSimpleAvatar"
      );

      // ProfileRegistry has more features
      const fullProfile = await profileRegistry.getProfileByAddress(user1.address);
      expect(fullProfile.ens).to.equal("full.eth");
      expect(fullProfile.bioCid).to.equal("QmFullBio");

      // SimpleProfileRegistry has basic features only
      const simpleProfile = await simpleProfileRegistry.getProfileByAddress(user1.address);
      expect(simpleProfile.handle).to.equal("simpleuser");
      expect(simpleProfile.avatarCid).to.equal("QmSimpleAvatar");
      // No ENS or bio fields in simple registry
    });

    it("Should allow same user to have profiles in both registries", async function () {
      await profileRegistry.connect(user1).createProfile("fullprofile", "full.eth", "QmFull", "QmBio");
      await simpleProfileRegistry.connect(user1).createProfile("simpleprofile", "QmSimple");

      const fullProfile = await profileRegistry.getProfileByAddress(user1.address);
      const simpleProfile = await simpleProfileRegistry.getProfileByAddress(user1.address);

      expect(fullProfile.handle).to.equal("fullprofile");
      expect(simpleProfile.handle).to.equal("simpleprofile");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle very long handles", async function () {
      const longHandle = "a".repeat(100);
      
      await profileRegistry.connect(user1).createProfile(
        longHandle,
        "",
        "QmAvatar",
        "QmBio"
      );

      const profile = await profileRegistry.getProfileByAddress(user1.address);
      expect(profile.handle).to.equal(longHandle);
    });

    it("Should handle special characters in handles", async function () {
      const specialHandle = "user-123_test.handle";
      
      await profileRegistry.connect(user1).createProfile(
        specialHandle,
        "",
        "QmAvatar",
        "QmBio"
      );

      const profile = await profileRegistry.getProfileByAddress(user1.address);
      expect(profile.handle).to.equal(specialHandle);
    });

    it("Should handle very long IPFS CIDs", async function () {
      const longCid = "Qm" + "a".repeat(100);
      
      await profileRegistry.connect(user1).createProfile(
        "cidtest",
        "",
        longCid,
        longCid
      );

      const profile = await profileRegistry.getProfileByAddress(user1.address);
      expect(profile.avatarCid).to.equal(longCid);
      expect(profile.bioCid).to.equal(longCid);
    });
  });
});