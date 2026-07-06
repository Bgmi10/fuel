
import { jwtVerify, SignJWT } from "jose";
import { User } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
const secret = new TextEncoder().encode(process.env.JWT_SECRET);



export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    return await verifyToken(token);
  }

export async function createToken(payload: Partial<User>): Promise<string> {
    return await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
  }
  
  
  export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }
  
  
  export async function verifyToken(token: string): Promise<User | null> {
    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ["HS256"],
      });
      return payload as User;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
  
  export async function getSession(): Promise<User | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');
    
    if (!token) {
      return null;
    }
    
    return await verifyToken(token.value);
  }
  
  export async function removeAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
  }