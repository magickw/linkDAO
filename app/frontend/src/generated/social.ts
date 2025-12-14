import {
  createUseReadContract,
  createUseWriteContract,
  createUseSimulateContract,
  createUseWatchContractEvent,
} from 'wagmi/codegen'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// FollowModule
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'follower',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'following',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Followed',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'follower',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'following',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
    ],
    name: 'Unfollowed',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'follow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'follower', internalType: 'address', type: 'address' },
      { name: 'following', internalType: 'address', type: 'address' },
    ],
    name: 'isFollowing',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'target', internalType: 'address', type: 'address' }],
    name: 'unfollow',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: '', internalType: 'address', type: 'address' },
      { name: '', internalType: 'address', type: 'address' },
    ],
    name: 'follows',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'followerCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'followingCount',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleAddress = {
  8453: '0x2345678901234567890123456789012345678901',
  84532: '0x2345678901234567890123456789012345678901',
  11155111: '0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const followModuleConfig = {
  address: followModuleAddress,
  abi: followModuleAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// ProfileRegistry
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryAbi = [
  { type: 'constructor', inputs: [], stateMutability: 'nonpayable' },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'owner',
        internalType: 'address',
        type: 'address',
        indexed: true,
      },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
      {
        name: 'handle',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'createdAt',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
    ],
    name: 'ProfileCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'from', internalType: 'address', type: 'address', indexed: true },
      { name: 'to', internalType: 'address', type: 'address', indexed: true },
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: true,
      },
    ],
    name: 'Transfer',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      {
        name: 'tokenId',
        internalType: 'uint256',
        type: 'uint256',
        indexed: false,
      },
      {
        name: 'handle',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'avatarCid',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
      {
        name: 'bioCid',
        internalType: 'string',
        type: 'string',
        indexed: false,
      },
    ],
    name: 'ProfileUpdated',
  },
  {
    type: 'function',
    inputs: [
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'owner', internalType: 'address', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'handle', internalType: 'string', type: 'string' },
      { name: 'ens', internalType: 'string', type: 'string' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
    ],
    name: 'createProfile',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'user', internalType: 'address', type: 'address' }],
    name: 'getProfileByAddress',
    outputs: [
      {
        name: '',
        internalType: 'struct ProfileRegistry.Profile',
        type: 'tuple',
        components: [
          { name: 'handle', internalType: 'string', type: 'string' },
          { name: 'ens', internalType: 'string', type: 'string' },
          { name: 'avatarCid', internalType: 'string', type: 'string' },
          { name: 'bioCid', internalType: 'string', type: 'string' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'handle', internalType: 'string', type: 'string' }],
    name: 'getProfileByHandle',
    outputs: [
      {
        name: '',
        internalType: 'struct ProfileRegistry.Profile',
        type: 'tuple',
        components: [
          { name: 'handle', internalType: 'string', type: 'string' },
          { name: 'ens', internalType: 'string', type: 'string' },
          { name: 'avatarCid', internalType: 'string', type: 'string' },
          { name: 'bioCid', internalType: 'string', type: 'string' },
          { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'owner', internalType: 'address', type: 'address' },
      { name: 'operator', internalType: 'address', type: 'address' },
    ],
    name: 'isApprovedForAll',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'name',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', internalType: 'address', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'data', internalType: 'bytes', type: 'bytes' },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'operator', internalType: 'address', type: 'address' },
      { name: 'approved', internalType: 'bool', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'interfaceId', internalType: 'bytes4', type: 'bytes4' }],
    name: 'supportsInterface',
    outputs: [{ name: '', internalType: 'bool', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: 'tokenId', internalType: 'uint256', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', internalType: 'string', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [
      { name: 'from', internalType: 'address', type: 'address' },
      { name: 'to', internalType: 'address', type: 'address' },
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
    ],
    name: 'updateProfile',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [
      { name: 'tokenId', internalType: 'uint256', type: 'uint256' },
      { name: 'ens', internalType: 'string', type: 'string' },
    ],
    name: 'updateEns',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'address', type: 'address' }],
    name: 'addressToTokenId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'string', type: 'string' }],
    name: 'handleToTokenId',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    inputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    name: 'profiles',
    outputs: [
      { name: 'handle', internalType: 'string', type: 'string' },
      { name: 'ens', internalType: 'string', type: 'string' },
      { name: 'avatarCid', internalType: 'string', type: 'string' },
      { name: 'bioCid', internalType: 'string', type: 'string' },
      { name: 'createdAt', internalType: 'uint256', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryAddress = {
  8453: '0x1234567890123456789012345678901234567890',
  84532: '0x1234567890123456789012345678901234567890',
  11155111: '0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD',
} as const

/**
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const profileRegistryConfig = {
  address: profileRegistryAddress,
  abi: profileRegistryAbi,
} as const

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// React
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModule = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"isFollowing"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleIsFollowing =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'isFollowing',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follows"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollows = /*#__PURE__*/ createUseReadContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follows',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followerCount"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollowerCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followerCount',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"followingCount"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useReadFollowModuleFollowingCount =
  /*#__PURE__*/ createUseReadContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'followingCount',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModule = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModuleFollow = /*#__PURE__*/ createUseWriteContract({
  abi: followModuleAbi,
  address: followModuleAddress,
  functionName: 'follow',
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWriteFollowModuleUnfollow =
  /*#__PURE__*/ createUseWriteContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModule = /*#__PURE__*/ createUseSimulateContract({
  abi: followModuleAbi,
  address: followModuleAddress,
})

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"follow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModuleFollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'follow',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link followModuleAbi}__ and `functionName` set to `"unfollow"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useSimulateFollowModuleUnfollow =
  /*#__PURE__*/ createUseSimulateContract({
    abi: followModuleAbi,
    address: followModuleAddress,
    functionName: 'unfollow',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Followed"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleFollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Followed',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link followModuleAbi}__ and `eventName` set to `"Unfollowed"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x2345678901234567890123456789012345678901)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x624Fe32F9b61c612ADD2b2Ef505bb99e4A7f6439)
 */
export const useWatchFollowModuleUnfollowedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: followModuleAbi,
    address: followModuleAddress,
    eventName: 'Unfollowed',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistry = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"balanceOf"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryBalanceOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'balanceOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getApproved"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetApproved =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getApproved',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByAddress"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetProfileByAddress =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByAddress',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"getProfileByHandle"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryGetProfileByHandle =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'getProfileByHandle',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"isApprovedForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryIsApprovedForAll =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'isApprovedForAll',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"name"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryName = /*#__PURE__*/ createUseReadContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
  functionName: 'name',
})

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"ownerOf"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryOwnerOf =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'ownerOf',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"supportsInterface"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistrySupportsInterface =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'supportsInterface',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"symbol"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistrySymbol = /*#__PURE__*/ createUseReadContract(
  {
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'symbol',
  },
)

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"tokenURI"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryTokenUri =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'tokenURI',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"addressToTokenId"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryAddressToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'addressToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"handleToTokenId"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryHandleToTokenId =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'handleToTokenId',
  })

/**
 * Wraps __{@link useReadContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"profiles"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useReadProfileRegistryProfiles =
  /*#__PURE__*/ createUseReadContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'profiles',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistry = /*#__PURE__*/ createUseWriteContract({
  abi: profileRegistryAbi,
  address: profileRegistryAddress,
})

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryApprove =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useWriteContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWriteProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseWriteContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistry =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"approve"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryApprove =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'approve',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"createProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryCreateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'createProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"safeTransferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistrySafeTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'safeTransferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"setApprovalForAll"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistrySetApprovalForAll =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'setApprovalForAll',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"transferFrom"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryTransferFrom =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'transferFrom',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateProfile"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryUpdateProfile =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateProfile',
  })

/**
 * Wraps __{@link useSimulateContract}__ with `abi` set to __{@link profileRegistryAbi}__ and `functionName` set to `"updateEns"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useSimulateProfileRegistryUpdateEns =
  /*#__PURE__*/ createUseSimulateContract({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    functionName: 'updateEns',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileCreated"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryProfileCreatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileCreated',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"Transfer"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryTransferEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'Transfer',
  })

/**
 * Wraps __{@link useWatchContractEvent}__ with `abi` set to __{@link profileRegistryAbi}__ and `eventName` set to `"ProfileUpdated"`
 *
 * - [__View Contract on Base Basescan__](https://basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Base Sepolia Basescan__](https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890)
 * - [__View Contract on Sepolia Etherscan__](https://sepolia.etherscan.io/address/0x8Aef61A10FbEBF9eB09315e9a1227359adDae7AD)
 */
export const useWatchProfileRegistryProfileUpdatedEvent =
  /*#__PURE__*/ createUseWatchContractEvent({
    abi: profileRegistryAbi,
    address: profileRegistryAddress,
    eventName: 'ProfileUpdated',
  })
