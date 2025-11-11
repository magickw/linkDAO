// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../LDAOToken.sol";
import "../LDAOTreasury.sol";

/**
 * @title CharityProposal
 * @notice Contract to manage charity donation campaigns and verified organizations
 */
contract CharityProposal is Ownable, ReentrancyGuard {
    // Struct to store charity organization information
    struct CharityOrganization {
        uint256 id;
        address walletAddress;
        string name;
        string description;
        string website;
        string registrationNumber;
        bool isVerified;
        uint256 registrationDate;
        address verifier;
        string verificationProof; // IPFS hash of verification documents
        uint256 totalDonationsReceived;
        uint256 totalCampaigns;
    }
    
    // Struct to track donation campaigns
    struct CharityCampaign {
        uint256 id;
        uint256 charityId;
        address proposer;
        string title;
        string description;
        string impactMetrics;
        uint256 targetAmount;
        uint256 currentAmount;
        uint256 startDate;
        uint256 endDate;
        uint256 proposalId; // Link to governance proposal
        CampaignStatus status;
        string donationReceipt; // IPFS hash of donation receipt
        bool isVerified;
    }
    
    // Enum for campaign status
    enum CampaignStatus {
        PENDING,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }
    
    // Mappings
    mapping(uint256 => CharityOrganization) public charities;
    mapping(address => uint256) public charityAddressToId;
    mapping(uint256 => CharityCampaign) public campaigns;
    mapping(uint256 => uint256[]) public charityCampaigns; // charityId => campaignIds
    mapping(address => uint256[]) public userCampaigns; // user => campaignIds
    
    // Counters
    uint256 public nextCharityId = 1;
    uint256 public nextCampaignId = 1;
    
    // Token and Treasury references
    LDAOToken public governanceToken;
    LDAOTreasury public treasury;
    
    // Configuration
    uint256 public minDonationAmount = 10 * 10**18; // 10 LDAO minimum
    uint256 public maxCampaignDuration = 90 days; // 90 days maximum
    
    // Events
    event CharityRegistered(
        uint256 indexed charityId,
        address indexed walletAddress,
        string name,
        address indexed registrant
    );
    
    event CharityVerified(
        uint256 indexed charityId,
        address indexed walletAddress,
        address indexed verifier
    );
    
    event CampaignCreated(
        uint256 indexed campaignId,
        uint256 indexed charityId,
        address indexed proposer,
        string title,
        uint256 targetAmount
    );
    
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 totalAmount
    );
    
    event CampaignCompleted(
        uint256 indexed campaignId,
        uint256 totalAmount
    );
    
    event CampaignCancelled(
        uint256 indexed campaignId
    );
    
    event DonationReceiptVerified(
        uint256 indexed campaignId,
        string receiptHash
    );
    
    constructor(address _governanceToken, address _treasury) {
        require(_governanceToken != address(0), "Invalid governance token address");
        require(_treasury != address(0), "Invalid treasury address");
        governanceToken = LDAOToken(_governanceToken);
        treasury = LDAOTreasury(_treasury);
    }
    
    /**
     * @dev Register a new charity organization
     * @param walletAddress Wallet address of the charity
     * @param name Name of the charity
     * @param description Description of the charity's mission
     * @param website Charity website
     * @param registrationNumber Official registration number
     */
    function registerCharity(
        address walletAddress,
        string memory name,
        string memory description,
        string memory website,
        string memory registrationNumber
    ) external nonReentrant returns (uint256) {
        require(walletAddress != address(0), "Invalid wallet address");
        require(bytes(name).length > 0, "Name is required");
        require(charityAddressToId[walletAddress] == 0, "Charity already registered");
        
        uint256 charityId = nextCharityId++;
        
        CharityOrganization storage newCharity = charities[charityId];
        newCharity.id = charityId;
        newCharity.walletAddress = walletAddress;
        newCharity.name = name;
        newCharity.description = description;
        newCharity.website = website;
        newCharity.registrationNumber = registrationNumber;
        newCharity.isVerified = false;
        newCharity.registrationDate = block.timestamp;
        newCharity.verifier = address(0);
        newCharity.verificationProof = "";
        newCharity.totalDonationsReceived = 0;
        newCharity.totalCampaigns = 0;
        
        charityAddressToId[walletAddress] = charityId;
        
        emit CharityRegistered(charityId, walletAddress, name, msg.sender);
        
        return charityId;
    }
    
    /**
     * @dev Verify a charity organization (owner or designated verifier only)
     * @param charityId ID of the charity to verify
     * @param verificationProof IPFS hash of verification documents
     */
    function verifyCharity(
        uint256 charityId,
        string memory verificationProof
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId < nextCharityId, "Invalid charity ID");
        
        CharityOrganization storage charity = charities[charityId];
        require(!charity.isVerified, "Charity already verified");
        require(bytes(verificationProof).length > 0, "Verification proof required");
        
        charity.isVerified = true;
        charity.verifier = msg.sender;
        charity.verificationProof = verificationProof;
        
        emit CharityVerified(charityId, charity.walletAddress, msg.sender);
    }
    
    /**
     * @dev Create a new charity donation campaign
     * @param charityId ID of the charity to receive donations
     * @param title Campaign title
     * @param description Campaign description
     * @param impactMetrics Expected impact metrics
     * @param targetAmount Target donation amount
     * @param duration Campaign duration in seconds
     */
    function createCharityCampaign(
        uint256 charityId,
        string memory title,
        string memory description,
        string memory impactMetrics,
        uint256 targetAmount,
        uint256 duration
    ) external nonReentrant returns (uint256) {
        require(charityId > 0 && charityId < nextCharityId, "Invalid charity ID");
        require(bytes(title).length > 0, "Title is required");
        require(targetAmount >= minDonationAmount, "Target amount below minimum");
        require(duration <= maxCampaignDuration, "Campaign duration too long");
        
        CharityOrganization storage charity = charities[charityId];
        require(charity.isVerified, "Charity must be verified");
        
        uint256 campaignId = nextCampaignId++;
        
        CharityCampaign storage newCampaign = campaigns[campaignId];
        newCampaign.id = campaignId;
        newCampaign.charityId = charityId;
        newCampaign.proposer = msg.sender;
        newCampaign.title = title;
        newCampaign.description = description;
        newCampaign.impactMetrics = impactMetrics;
        newCampaign.targetAmount = targetAmount;
        newCampaign.currentAmount = 0;
        newCampaign.startDate = block.timestamp;
        newCampaign.endDate = block.timestamp + duration;
        newCampaign.proposalId = 0; // Will be set when linked to governance proposal
        newCampaign.status = CampaignStatus.ACTIVE;
        newCampaign.donationReceipt = "";
        newCampaign.isVerified = false;
        
        // Update charity stats
        charity.totalCampaigns++;
        
        // Update mappings
        charityCampaigns[charityId].push(campaignId);
        userCampaigns[msg.sender].push(campaignId);
        
        emit CampaignCreated(campaignId, charityId, msg.sender, title, targetAmount);
        
        return campaignId;
    }
    
    /**
     * @dev Donate directly to a charity campaign
     * @param campaignId ID of the campaign to donate to
     * @param amount Amount to donate
     */
    function donateToCampaign(
        uint256 campaignId,
        uint256 amount
    ) external nonReentrant {
        require(campaignId > 0 && campaignId < nextCampaignId, "Invalid campaign ID");
        require(amount >= minDonationAmount, "Donation amount below minimum");
        
        CharityCampaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not active");
        require(block.timestamp <= campaign.endDate, "Campaign has ended");
        require(campaign.currentAmount + amount <= campaign.targetAmount, "Exceeds target amount");
        
        // Transfer tokens from donor to this contract
        require(
            governanceToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        // Update campaign
        campaign.currentAmount += amount;
        
        // Update charity stats
        CharityOrganization storage charity = charities[campaign.charityId];
        charity.totalDonationsReceived += amount;
        
        emit DonationReceived(campaignId, msg.sender, amount, campaign.currentAmount);
        
        // Check if campaign is completed
        if (campaign.currentAmount >= campaign.targetAmount) {
            campaign.status = CampaignStatus.COMPLETED;
            emit CampaignCompleted(campaignId, campaign.currentAmount);
        }
    }
    
    /**
     * @dev Verify donation receipt from charity (owner or designated verifier)
     * @param campaignId ID of the campaign
     * @param receiptHash IPFS hash of the donation receipt
     */
    function verifyDonationReceipt(
        uint256 campaignId,
        string memory receiptHash
    ) external onlyOwner nonReentrant {
        require(campaignId > 0 && campaignId < nextCampaignId, "Invalid campaign ID");
        require(bytes(receiptHash).length > 0, "Receipt hash required");
        
        CharityCampaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.COMPLETED, "Campaign not completed");
        require(!campaign.isVerified, "Receipt already verified");
        
        campaign.donationReceipt = receiptHash;
        campaign.isVerified = true;
        
        emit DonationReceiptVerified(campaignId, receiptHash);
    }
    
    /**
     * @dev Cancel an active campaign (owner only)
     * @param campaignId ID of the campaign to cancel
     */
    function cancelCampaign(uint256 campaignId) external onlyOwner nonReentrant {
        require(campaignId > 0 && campaignId < nextCampaignId, "Invalid campaign ID");
        
        CharityCampaign storage campaign = campaigns[campaignId];
        require(campaign.status == CampaignStatus.ACTIVE, "Campaign not active");
        
        campaign.status = CampaignStatus.CANCELLED;
        
        emit CampaignCancelled(campaignId);
    }
    
    /**
     * @dev Update minimum donation amount (owner only)
     * @param newMinAmount New minimum donation amount
     */
    function updateMinDonationAmount(uint256 newMinAmount) external onlyOwner {
        minDonationAmount = newMinAmount;
    }
    
    /**
     * @dev Update maximum campaign duration (owner only)
     * @param newMaxDuration New maximum campaign duration
     */
    function updateMaxCampaignDuration(uint256 newMaxDuration) external onlyOwner {
        maxCampaignDuration = newMaxDuration;
    }
    
    /**
     * @dev Get charity details
     * @param charityId ID of the charity
     * @return Charity organization details
     */
    function getCharityDetails(uint256 charityId) external view returns (CharityOrganization memory) {
        return charities[charityId];
    }
    
    /**
     * @dev Get campaign details
     * @param campaignId ID of the campaign
     * @return Charity campaign details
     */
    function getCampaignDetails(uint256 campaignId) external view returns (CharityCampaign memory) {
        return campaigns[campaignId];
    }
    
    /**
     * @dev Get campaigns for a specific charity
     * @param charityId ID of the charity
     * @return Array of campaign IDs
     */
    function getCharityCampaigns(uint256 charityId) external view returns (uint256[] memory) {
        return charityCampaigns[charityId];
    }
    
    /**
     * @dev Get campaigns created by a specific user
     * @param user Address of the user
     * @return Array of campaign IDs
     */
    function getUserCampaigns(address user) external view returns (uint256[] memory) {
        return userCampaigns[user];
    }
    
    /**
     * @dev Check if a charity is verified
     * @param charityId ID of the charity
     * @return bool indicating if charity is verified
     */
    function isCharityVerified(uint256 charityId) external view returns (bool) {
        return charities[charityId].isVerified;
    }
}