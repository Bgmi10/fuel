import { removeMemberAuthCookie } from '@/app/utils/memberAuth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Remove the auth cookie
    await removeMemberAuthCookie();

    return NextResponse.json({
        success: true
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}