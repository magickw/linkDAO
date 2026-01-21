/**
 * RPC Proxy Utility
 * 
 * This utility handles RPC requests through a Next.js API proxy to avoid CORS issues
 * when making requests to external RPC providers like Alchemy.
 */

export interface RpcRequest {
  jsonrpc: string;
  method: string;
  params: any[];
  id: number;
}

export interface RpcResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Send an RPC request through the proxy
 * @param rpcUrl The RPC endpoint URL
 * @param request The RPC request object
 * @returns The RPC response
 */
export async function sendRpcRequest(rpcUrl: string, request: RpcRequest): Promise<RpcResponse> {
  try {
    // Use the Next.js API proxy to avoid CORS issues
    const proxyUrl = `/api/proxy/rpc?target=${encodeURIComponent(rpcUrl)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`RPC request failed with status ${response.status}`);
    }
    
    const data: RpcResponse = await response.json();
    return data;
  } catch (error) {
    console.error('RPC request error:', error);
    throw error;
  }
}

/**
 * Get the current block number
 * @param rpcUrl The RPC endpoint URL
 * @returns The current block number
 */
export async function getCurrentBlockNumber(rpcUrl: string): Promise<string> {
  const request: RpcRequest = {
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1,
  };
  
  const response = await sendRpcRequest(rpcUrl, request);
  
  if (response.error) {
    throw new Error(`RPC error: ${response.error.message}`);
  }
  
  return response.result;
}

/**
 * Get account balance
 * @param rpcUrl The RPC endpoint URL
 * @param address The account address
 * @param blockTag The block tag (default: 'latest')
 * @returns The account balance
 */
export async function getAccountBalance(
  rpcUrl: string, 
  address: string, 
  blockTag: string = 'latest'
): Promise<string> {
  const request: RpcRequest = {
    jsonrpc: '2.0',
    method: 'eth_getBalance',
    params: [address, blockTag],
    id: 1,
  };
  
  const response = await sendRpcRequest(rpcUrl, request);
  
  if (response.error) {
    throw new Error(`RPC error: ${response.error.message}`);
  }
  
  return response.result;
}