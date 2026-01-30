import { NextRequest, NextResponse } from 'next/server';
import { sellerFeeService } from '@/services/sellerFeeService';
import { logger } from '@/utils/logger';

// Helper function to validate JWT token with backend
async function validateToken(token: string): Promise<{ isValid: boolean; walletAddress?: string }> {
  try {
    // Call backend to validate token
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
    const response = await fetch(`${backendUrl}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { isValid: false };
    }

    const data = await response.json();
    return {
      isValid: data.valid === true,
      walletAddress: data.walletAddress
    };
  } catch (error) {
    logger.error('Token validation error:', error);
    return { isValid: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const validationResult = await validateToken(token);
    if (!validationResult.isValid || !validationResult.walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const walletAddress = validationResult.walletAddress;
    const balance = await sellerFeeService.getSellerBalance();

    return NextResponse.json({
      success: true,
      data: balance
    });
  } catch (error) {
    logger.error('Error fetching seller balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch seller balance' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const validationResult = await validateToken(token);
    if (!validationResult.isValid || !validationResult.walletAddress) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const walletAddress = validationResult.walletAddress;
    const body = await request.json();
    const { requiredAmount } = body;

    if (requiredAmount === undefined) {
      return NextResponse.json(
        { success: false, message: 'Required amount is required' },
        { status: 400 }
      );
    }

    const balanceCheck = await sellerFeeService.checkSellerBalance(parseFloat(requiredAmount));

    return NextResponse.json({
      success: true,
      data: balanceCheck
    });
  } catch (error) {
    logger.error('Error checking seller balance:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to check seller balance' 
      },
      { status: 500 }
    );
  }
}