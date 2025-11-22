import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("NFTCollectionFactory", function () {
  let factory: Contract;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, user1] = await ethers.getSigners();

    const NFTCollectionFactory = await ethers.getContractFactory("NFTCollectionFactory");
    factory = await NFTCollectionFactory.deploy();
    await factory.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Should set initial creation fee", async function () {
      expect(await factory.creationFee()).to.equal(ethers.parseEther("0.01"));
    });

    it("Should set fee recipient to deployer", async function () {
      expect(await factory.feeRecipient()).to.equal(owner.address);
    });
  });

  describe("Collection Creation", function () {
    it("Should create a new collection successfully", async function () {
      const collectionInfo = {
        description: "Test Collection",
        image: "https://example.com/image.png",
        externalUrl: "https://example.com",
        maxSupply: 1000,
        mintPrice: ethers.parseEther("0.1"),
        isPublicMint: true,
        creator: creator.address,
        createdAt: 0
      };

      const creationFee = await factory.creationFee();
      
      await expect(
        factory.connect(creator).createCollection(
          "Test Collection",
          "TEST",
          collectionInfo,
          250, // 2.5% royalty
          { value: creationFee }
        )
      ).to.emit(factory, "CollectionCreated");
    });

    it("Should track collections correctly", async function () {
      const collectionInfo = {
        description: "Test Collection",
        image: "https://example.com/image.png",
        externalUrl: "https://example.com",
        maxSupply: 1000,
        mintPrice: ethers.parseEther("0.1"),
        isPublicMint: true,
        creator: creator.address,
        createdAt: 0
      };

      const creationFee = await factory.creationFee();
      
      await factory.connect(creator).createCollection(
        "Test Collection",
        "TEST",
        collectionInfo,
        250,
        { value: creationFee }
      );

      const creatorCollections = await factory.getCreatorCollections(creator.address);
      expect(creatorCollections.length).to.equal(1);
      expect(creatorCollections[0].name).to.equal("Test Collection");
      expect(creatorCollections[0].creator).to.equal(creator.address);

      const collectionCount = await factory.getCollectionCount();
      expect(collectionCount).to.equal(1);
    });
  });

  describe("Collection Verification", function () {
    it("Should verify collection successfully", async function () {
      const collectionInfo = {
        description: "Test Collection",
        image: "https://example.com/image.png",
        externalUrl: "https://example.com",
        maxSupply: 1000,
        mintPrice: ethers.parseEther("0.1"),
        isPublicMint: true,
        creator: creator.address,
        createdAt: 0
      };

      const creationFee = await factory.creationFee();
      
      const tx = await factory.connect(creator).createCollection(
        "Test Collection",
        "TEST",
        collectionInfo,
        250,
        { value: creationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === "CollectionCreated");
      const collectionAddress = event?.args?.collectionAddress;

      await expect(
        factory.connect(owner).verifyCollection(collectionAddress)
      ).to.emit(factory, "CollectionVerified")
        .withArgs(collectionAddress);

      expect(await factory.verifiedCollections(collectionAddress)).to.be.true;
    });
  });

  describe("Collection Interaction", function () {
    it("Should allow minting from created collection", async function () {
      const collectionInfo = {
        description: "Test Collection",
        image: "https://example.com/image.png",
        externalUrl: "https://example.com",
        maxSupply: 1000,
        mintPrice: ethers.parseEther("0.1"),
        isPublicMint: true,
        creator: creator.address,
        createdAt: 0
      };

      const creationFee = await factory.creationFee();
      
      const tx = await factory.connect(creator).createCollection(
        "Test Collection",
        "TEST",
        collectionInfo,
        250,
        { value: creationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === "CollectionCreated");
      const collectionAddress = event?.args?.collectionAddress;

      // Get the collection contract
      const NFTCollection = await ethers.getContractFactory("NFTCollection");
      const collection = NFTCollection.attach(collectionAddress);

      // Mint an NFT
      const mintPrice = ethers.parseEther("0.1");
      await expect(
        collection.connect(user1).mint(
          user1.address,
          "https://example.com/token/1",
          { value: mintPrice }
        )
      ).to.emit(collection, "NFTMinted");

      expect(await collection.ownerOf(0)).to.equal(user1.address);
      expect(await collection.totalSupply()).to.equal(1);
    });
  });
});