import { getPublicClient, getWalletClient } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { ethers } from 'ethers'

/**
 * Get the public client for read operations
 */
export async function getProvider() {
  try {
    const client = getPublicClient(config)
    // Convert wagmi client to ethers provider
    const provider = new ethers.providers.Web3Provider(client.transport.provider as any)
    return provider
  } catch (error) {
    console.error('Error getting provider:', error)
    return null
  }
}

/**
 * Get the wallet client for write operations
 */
export async function getSigner() {
  try {
    const client = await getWalletClient(config)
    if (!client) return null
    
    // Convert wagmi client to ethers signer
    const provider = new ethers.providers.Web3Provider(client.transport.provider as any)
    const signer = provider.getSigner()
    return signer
  } catch (error) {
    console.error('Error getting signer:', error)
    return null
  }
}

/**
 * Get the current connected account
 */
export async function getAccount() {
  try {
    const client = await getWalletClient(config)
    return client?.account
  } catch (error) {
    console.error('Error getting account:', error)
    return null
  }
}

/**
 * Format ether value
 */
export function formatEther(value: ethers.BigNumberish): string {
  try {
    return ethers.utils.formatEther(value)
  } catch (error) {
    console.error('Error formatting ether:', error)
    return '0'
  }
}

/**
 * Parse ether value
 */
export function parseEther(value: string): ethers.BigNumber {
  try {
    return ethers.utils.parseEther(value)
  } catch (error) {
    console.error('Error parsing ether:', error)
    return ethers.BigNumber.from(0)
  }
}

/**
 * Format units
 */
export function formatUnits(value: ethers.BigNumberish, decimals: number): string {
  try {
    return ethers.utils.formatUnits(value, decimals)
  } catch (error) {
    console.error('Error formatting units:', error)
    return '0'
  }
}

/**
 * Parse units
 */
export function parseUnits(value: string, decimals: number): ethers.BigNumber {
  try {
    return ethers.utils.parseUnits(value, decimals)
  } catch (error) {
    console.error('Error parsing units:', error)
    return ethers.BigNumber.from(0)
  }
}