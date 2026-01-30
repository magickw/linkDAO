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
    const { amount, reason, metadata } = body;

    if (!amount || !reason) {
      return NextResponse.json(
        { success: false, message: 'Amount and reason are required' },
        { status: 400 }
      );
    }

    const charge = await sellerFeeService.chargeSellerFees(
      parseFloat(amount),
      reason,
      metadata
    );

    return NextResponse.json({
      success: true,
      data: charge
    });
  } catch (error) {
    logger.error('Error processing seller fee charge:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to process fee charge' 
      },
      { status: 500 }
    );
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const charges = await sellerFeeService.getFeeCharges(limit, offset);

    return NextResponse.json({
      success: true,
      data: charges
    });
  } catch (error) {
    logger.error('Error fetching seller fee charges:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch fee charges' 
      },
      { status: 500 }
    );
  }
}