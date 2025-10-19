import { getPublicClient, getWalletClient } from '@wagmi/core'
import { config } from '@/lib/wagmi'
import { ethers } from 'ethers'
import { getChainRpcUrl } from '@/lib/wagmi'

/**
 * Get the public client for read operations
 */
export async function getProvider() {
  try {
  const client = getPublicClient(config)
    // If wagmi transport exposes an injected provider, use it.
    const injectedProvider = (client as any).transport?.provider
    if (injectedProvider) {
      return new ethers.providers.Web3Provider(injectedProvider as any)
    }

    // Fallback: prefer an env-driven RPC URL for server-side reads. This lets
    // deployments control which RPC the app uses during SSR/build.
    const envRpc = process.env.NEXT_PUBLIC_RPC_URL
    const envChainId = process.env.NEXT_PUBLIC_RPC_CHAIN_ID
    if (envRpc) {
      try {
        const chainId = envChainId ? parseInt(envChainId, 10) : undefined
        return new ethers.providers.JsonRpcProvider(envRpc, chainId)
      } catch (e) {
        console.warn('Invalid NEXT_PUBLIC_RPC_URL or NEXT_PUBLIC_RPC_CHAIN_ID, falling back to configured chain RPC', e)
      }
    }

    // If no env RPC configured, fall back to wagmi's chain URLs (use mainnet by default)
    try {
      const chainId = envChainId ? parseInt(envChainId, 10) : 1
      const rpcUrl = getChainRpcUrl(chainId)
      if (rpcUrl) {
        return new ethers.providers.JsonRpcProvider(rpcUrl)
      }
    } catch (e) {
      // ignore and use default provider below
    }

    // Last-resort: use ethers default provider (may require API keys)
    return ethers.getDefaultProvider()
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

    const injectedProvider = (client as any).transport?.provider
    if (!injectedProvider) return null

    const provider = new ethers.providers.Web3Provider(injectedProvider as any)
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