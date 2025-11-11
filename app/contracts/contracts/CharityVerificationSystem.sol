// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LDAOToken.sol";
import "./EnhancedLDAOTreasury.sol";
import "./governance/CharityProposal.sol";

/**
 * @title CharityVerificationSystem
 * @notice System for verifying charity organizations and managing their status
 */
contract CharityVerificationSystem is Ownable, ReentrancyGuard {
    // Enum for verification status
    enum VerificationStatus {
        UNVERIFIED,
        PENDING,
        VERIFIED,
        SUSPENDED,
        REVOKED
    }
    
    // Struct for charity information
    struct CharityInfo {
        uint256 id;
        address walletAddress;
        string name;
        string description;
        string website;
        string registrationNumber;
        string country;
        string category; // e.g., "Education", "Healthcare", "Environment", etc.
        VerificationStatus status;
        uint256 verificationDate;
        uint256 lastUpdated;
        address verifier; // Address that performed the verification
        string verificationDetails; // IPFS hash or other details
        string rejectionReason; // If status is REJECTED
        uint256 totalDonationsReceived;
        uint256 totalCampaigns;
        uint256 reputationScore; // 0-1000 scale
        bool isFeatured; // Whether the charity is featured
    }
    
    // Struct for verification applications
    struct VerificationApplication {
        uint256 charityId;
        address applicant;
        string applicationDetails;
        string supportingDocuments; // IPFS hash of documents
        uint256 applicationDate;
        VerificationStatus status;
        address reviewer;
        string reviewNotes;
        uint256 reviewDate;
    }
    
    // Mapping of charities by ID
    mapping(uint256 => CharityInfo) public charities;
    
    // Mapping of charities by wallet address
    mapping(address => uint256) public charityIdByAddress;
    
    // Mapping of verification applications by charity ID
    mapping(uint256 => VerificationApplication) public verificationApplications;
    
    // Mapping of external verification sources
    mapping(string => bool) public externalVerificationSources; // domain names or identifiers
    
    // Counters
    uint256 public charityCount;
    uint256 public applicationCount;
    
    // Verification parameters
    uint256 public requiredReputationForVerification = 100; // Minimum reputation score
    uint256 public verificationFee = 100 * 1e18; // Fee for verification (in LDAO)
    uint256 public verificationDuration = 365 days; // Duration after which verification needs renewal
    address public feeRecipient; // Where verification fees go
    
    // Governance and treasury
    LDAOToken public governanceToken;
    EnhancedLDAOTreasury public treasury;
    
    // Events
    event CharityRegistered(
        uint256 indexed charityId,
        address indexed walletAddress,
        string name,
        address indexed registrar
    );
    
    event VerificationApplied(
        uint256 indexed charityId,
        address indexed applicant,
        uint256 applicationId
    );
    
    event VerificationStatusUpdated(
        uint256 indexed charityId,
        VerificationStatus oldStatus,
        VerificationStatus newStatus,
        address indexed verifier,
        string details
    );
    
    event CharityFeatured(uint256 indexed charityId, bool featured);
    event VerificationFeeUpdated(uint256 oldFee, uint256 newFee);
    event RequiredReputationUpdated(uint256 oldReputation, uint256 newReputation);
    event ExternalVerificationSourceUpdated(string source, bool allowed);
    
    constructor(
        address _governanceToken,
        address _treasury,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_governanceToken != address(0), "Invalid governance token");
        require(_treasury != address(0), "Invalid treasury");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        governanceToken = LDAOToken(_governanceToken);
        treasury = EnhancedLDAOTreasury(_treasury);
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @notice Register a new charity for potential verification
     * @param walletAddress Wallet address of the charity
     * @param name Name of the charity
     * @param description Description of the charity's mission
     * @param website Charity website
     * @param registrationNumber Official registration number
     * @param country Country where charity operates
     * @param category Category of charity work
     */
    function registerCharity(
        address walletAddress,
        string memory name,
        string memory description,
        string memory website,
        string memory registrationNumber,
        string memory country,
        string memory category
    ) external nonReentrant returns (uint256) {
        require(walletAddress != address(0), "Invalid wallet address");
        require(bytes(name).length > 0, "Name is required");
        require(charityIdByAddress[walletAddress] == 0, "Charity already registered");
        
        uint256 charityId = ++charityCount;
        
        CharityInfo storage newCharity = charities[charityId];
        newCharity.id = charityId;
        newCharity.walletAddress = walletAddress;
        newCharity.name = name;
        newCharity.description = description;
        newCharity.website = website;
        newCharity.registrationNumber = registrationNumber;
        newCharity.country = country;
        newCharity.category = category;
        newCharity.status = VerificationStatus.UNVERIFIED;
        newCharity.verificationDate = 0;
        newCharity.lastUpdated = block.timestamp;
        newCharity.verifier = address(0);
        newCharity.verificationDetails = "";
        newCharity.rejectionReason = "";
        newCharity.totalDonationsReceived = 0;
        newCharity.totalCampaigns = 0;
        newCharity.reputationScore = 0;
        newCharity.isFeatured = false;
        
        // Update mappings
        charityIdByAddress[walletAddress] = charityId;
        
        emit CharityRegistered(charityId, walletAddress, name, msg.sender);
        
        return charityId;
    }
    
    /**
     * @notice Apply for verification of a registered charity
     * @param charityId ID of the charity to verify
     * @param applicationDetails Details about the application
     * @param supportingDocuments IPFS hash of supporting documents
     */
    function applyForVerification(
        uint256 charityId,
        string memory applicationDetails,
        string memory supportingDocuments
    ) external nonReentrant returns (uint256) {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        require(bytes(supportingDocuments).length > 0, "Supporting documents required");
        
        CharityInfo storage charity = charities[charityId];
        require(charity.walletAddress == msg.sender || charityIdByAddress[msg.sender] == charityId, "Not authorized to apply");
        require(charity.status != VerificationStatus.VERIFIED, "Charity already verified");
        require(charity.status != VerificationStatus.PENDING, "Verification already pending");
        
        // Process verification fee if applicable
        if (verificationFee > 0) {
            require(
                governanceToken.transferFrom(msg.sender, feeRecipient, verificationFee),
                "Fee payment failed"
            );
        }
        
        // Create application
        uint256 applicationId = ++applicationCount;
        VerificationApplication storage application = verificationApplications[charityId];
        application.charityId = charityId;
        application.applicant = msg.sender;
        application.applicationDetails = applicationDetails;
        application.supportingDocuments = supportingDocuments;
        application.applicationDate = block.timestamp;
        application.status = VerificationStatus.PENDING;
        application.reviewer = address(0);
        application.reviewNotes = "";
        application.reviewDate = 0;
        
        // Update charity status
        charity.status = VerificationStatus.PENDING;
        charity.lastUpdated = block.timestamp;
        
        emit VerificationApplied(charityId, msg.sender, applicationId);
        
        return applicationId;
    }
    
    /**
     * @notice Verify a charity (only owner/authorized verifier can call)
     * @param charityId ID of the charity to verify
     * @param verificationDetails Details about the verification
     * @param verificationSource Source of verification (optional)
     */
    function verifyCharity(
        uint256 charityId,
        string memory verificationDetails,
        string memory verificationSource
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        require(charity.status == VerificationStatus.PENDING, "Charity not pending verification");
        
        // Update charity info
        charity.status = VerificationStatus.VERIFIED;
        charity.verificationDate = block.timestamp;
        charity.lastUpdated = block.timestamp;
        charity.verifier = msg.sender;
        charity.verificationDetails = verificationDetails;
        charity.reputationScore = 500; // Start with medium reputation
        
        // Update application if it exists
        VerificationApplication storage application = verificationApplications[charityId];
        if (application.applicationDate > 0) {
            application.status = VerificationStatus.VERIFIED;
            application.reviewer = msg.sender;
            application.reviewDate = block.timestamp;
        }
        
        // Verify in treasury as well
        treasury.verifyCharity(charity.walletAddress, true);
        
        emit VerificationStatusUpdated(
            charityId, 
            VerificationStatus.PENDING, 
            VerificationStatus.VERIFIED, 
            msg.sender, 
            verificationSource
        );
    }
    
    /**
     * @notice Reject a charity verification application
     * @param charityId ID of the charity to reject
     * @param rejectionReason Reason for rejection
     */
    function rejectVerification(
        uint256 charityId,
        string memory rejectionReason
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        require(charity.status == VerificationStatus.PENDING, "Charity not pending verification");
        
        // Update charity info
        charity.status = VerificationStatus.REVOKED;
        charity.lastUpdated = block.timestamp;
        charity.verifier = msg.sender;
        charity.rejectionReason = rejectionReason;
        
        // Update application
        VerificationApplication storage application = verificationApplications[charityId];
        if (application.applicationDate > 0) {
            application.status = VerificationStatus.REVOKED;
            application.reviewer = msg.sender;
            application.reviewDate = block.timestamp;
            application.reviewNotes = rejectionReason;
        }
        
        emit VerificationStatusUpdated(
            charityId, 
            VerificationStatus.PENDING, 
            VerificationStatus.REVOKED, 
            msg.sender, 
            rejectionReason
        );
    }
    
    /**
     * @notice Suspend a verified charity
     * @param charityId ID of the charity to suspend
     * @param reason Reason for suspension
     */
    function suspendCharity(
        uint256 charityId,
        string memory reason
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        require(charity.status == VerificationStatus.VERIFIED, "Charity not verified");
        
        charity.status = VerificationStatus.SUSPENDED;
        charity.lastUpdated = block.timestamp;
        charity.rejectionReason = reason;
        
        // Unverify in treasury as well
        treasury.verifyCharity(charity.walletAddress, false);
        
        emit VerificationStatusUpdated(
            charityId, 
            VerificationStatus.VERIFIED, 
            VerificationStatus.SUSPENDED, 
            msg.sender, 
            reason
        );
    }
    
    /**
     * @notice Revoke verification from a charity
     * @param charityId ID of the charity to revoke
     * @param reason Reason for revocation
     */
    function revokeVerification(
        uint256 charityId,
        string memory reason
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        require(
            charity.status == VerificationStatus.VERIFIED || 
            charity.status == VerificationStatus.SUSPENDED,
            "Charity not in verified or suspended state"
        );
        
        charity.status = VerificationStatus.REVOKED;
        charity.lastUpdated = block.timestamp;
        charity.rejectionReason = reason;
        
        // Unverify in treasury as well
        treasury.verifyCharity(charity.walletAddress, false);
        
        emit VerificationStatusUpdated(
            charityId, 
            charity.status, 
            VerificationStatus.REVOKED, 
            msg.sender, 
            reason
        );
    }
    
    /**
     * @notice Reactivate a suspended charity
     * @param charityId ID of the charity to reactivate
     */
    function reactivateCharity(
        uint256 charityId
    ) external onlyOwner nonReentrant {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        require(charity.status == VerificationStatus.SUSPENDED, "Charity not suspended");
        
        charity.status = VerificationStatus.VERIFIED;
        charity.lastUpdated = block.timestamp;
        charity.rejectionReason = "";
        
        // Verify in treasury as well
        treasury.verifyCharity(charity.walletAddress, true);
        
        emit VerificationStatusUpdated(
            charityId, 
            VerificationStatus.SUSPENDED, 
            VerificationStatus.VERIFIED, 
            msg.sender, 
            "Reactivated"
        );
    }
    
    /**
     * @notice Update charity reputation score
     * @param charityId ID of the charity
     * @param newScore New reputation score (0-1000)
     */
    function updateReputationScore(
        uint256 charityId,
        uint256 newScore
    ) external onlyOwner {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        require(newScore <= 1000, "Score must be 0-1000");
        
        CharityInfo storage charity = charities[charityId];
        charity.reputationScore = newScore;
        charity.lastUpdated = block.timestamp;
    }
    
    /**
     * @notice Toggle featured status for a charity
     * @param charityId ID of the charity
     * @param featured Whether to feature the charity
     */
    function setFeaturedStatus(
        uint256 charityId,
        bool featured
    ) external onlyOwner {
        require(charityId > 0 && charityId <= charityCount, "Invalid charity ID");
        
        CharityInfo storage charity = charities[charityId];
        charity.isFeatured = featured;
        charity.lastUpdated = block.timestamp;
        
        emit CharityFeatured(charityId, featured);
    }
    
    /**
     * @notice Update verification fee
     * @param newFee New verification fee amount
     */
    function updateVerificationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = verificationFee;
        verificationFee = newFee;
        
        emit VerificationFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Update required reputation for verification
     * @param newReputation New required reputation score
     */
    function updateRequiredReputation(uint256 newReputation) external onlyOwner {
        uint256 oldReputation = requiredReputationForVerification;
        requiredReputationForVerification = newReputation;
        
        emit RequiredReputationUpdated(oldReputation, newReputation);
    }
    
    /**
     * @notice Update external verification source
     * @param source Name/identifier of the source
     * @param allowed Whether the source is allowed
     */
    function updateExternalVerificationSource(
        string memory source,
        bool allowed
    ) external onlyOwner {
        externalVerificationSources[source] = allowed;
        
        emit ExternalVerificationSourceUpdated(source, allowed);
    }
    
    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient address");
        feeRecipient = newRecipient;
    }
    
    /**
     * @notice Get charity information
     * @param charityId ID of the charity
     * @return Charity information
     */
    function getCharityInfo(uint256 charityId) external view returns (CharityInfo memory) {
        return charities[charityId];
    }
    
    /**
     * @notice Get charity information by wallet address
     * @param walletAddress Wallet address of the charity
     * @return Charity information
     */
    function getCharityInfoByAddress(address walletAddress) external view returns (CharityInfo memory) {
        uint256 charityId = charityIdByAddress[walletAddress];
        return charities[charityId];
    }
    
    /**
     * @notice Get verification application
     * @param charityId ID of the charity
     * @return Verification application details
     */
    function getVerificationApplication(uint256 charityId) external view returns (VerificationApplication memory) {
        return verificationApplications[charityId];
    }
    
    /**
     * @notice Check if a charity is verified
     * @param charityId ID of the charity
     * @return Whether the charity is verified
     */
    function isCharityVerified(uint256 charityId) public view returns (bool) {
        return charities[charityId].status == VerificationStatus.VERIFIED;
    }
    
    /**
     * @notice Check if a charity is verified by wallet address
     * @param walletAddress Wallet address of the charity
     * @return Whether the charity is verified
     */
    function isCharityVerifiedByAddress(address walletAddress) external view returns (bool) {
        uint256 charityId = charityIdByAddress[walletAddress];
        return isCharityVerified(charityId);
    }
    
    /**
     * @notice Get total number of charities
     * @return Total count
     */
    function getTotalCharities() external view returns (uint256) {
        return charityCount;
    }
    
    /**
     * @notice Get total number of applications
     * @return Total count
     */
    function getTotalApplications() external view returns (uint256) {
        return applicationCount;
    }
    
    /**
     * @notice Get all verified charities
     * @return Array of verified charity IDs
     */
    function getVerifiedCharities() public view returns (uint256[] memory) {
        uint256[] memory verifiedIds = new uint256[](charityCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= charityCount; i++) {
            if (charities[i].status == VerificationStatus.VERIFIED) {
                verifiedIds[count] = i;
                count++;
            }
        }
        
        // Create a new array with the exact size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = verifiedIds[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get featured charities
     * @return Array of featured charity IDs
     */
    function getFeaturedCharities() external view returns (uint256[] memory) {
        uint256[] memory allVerified = getVerifiedCharities();
        uint256[] memory featuredIds = new uint256[](allVerified.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allVerified.length; i++) {
            if (charities[allVerified[i]].isFeatured) {
                featuredIds[count] = allVerified[i];
                count++;
            }
        }
        
        // Create a new array with the exact size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = featuredIds[i];
        }
        
        return result;
    }
    
    /**
     * @notice Get charities by category
     * @param category Category to filter by
     * @return Array of charity IDs in the category
     */
    function getCharitiesByCategory(string memory category) external view returns (uint256[] memory) {
        uint256[] memory allCharities = new uint256[](charityCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= charityCount; i++) {
            if (keccak256(bytes(charities[i].category)) == keccak256(bytes(category))) {
                allCharities[count] = i;
                count++;
            }
        }
        
        // Create a new array with the exact size
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allCharities[i];
        }
        
        return result;
    }
}