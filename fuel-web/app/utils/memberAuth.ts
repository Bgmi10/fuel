import { jwtVerify, SignJWT } from "jose";
import { Member } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/prisma";

const secret = new TextEncoder().encode(
  process.env.MEMBER_JWT_SECRET || process.env.JWT_SECRET
);

const COOKIE_NAME = "member-auth-token";

export async function getMemberFromRequest(
  request: NextRequest
): Promise<Member | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifyMemberToken(token);
}

export async function createMemberToken(
  payload: Partial<Member>
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function setMemberAuthCookie(token: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function verifyMemberToken(
  token: string
): Promise<Member | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return payload as Member;
  } catch (error) {
    console.error("Member token verification failed:", error);
    return null;
  }
}

export async function getMemberSession(
  request?: NextRequest
): Promise<Member | null> {

  let token: string | undefined;

  // Mobile
  if (request) {
    const auth = request.headers.get("authorization");

    if (auth?.startsWith("Bearer ")) {
      token = auth.replace("Bearer ", "");
    }
  }

  // Web
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) {
    return null;
  }

  const user = await verifyMemberToken(token);

  if (!user) {
    return null;
  }

  return prisma.member.findUnique({
    where: {
      id: user.id,
    },
    include: {
      fitnessAssessments: {
        orderBy: {
          assessmentDate: "desc",
        },
      },
      slotBookings: {
        include: {
          branch: true,
          subscription: true,
          slot: true,
        },
      },
      referrals: {
        include: {
          referredMember: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      subscriptions: {
        include: {
          branch: true,
          package: true,
          invoice: {
            where: {
              status: {
                in: ["PARTIAL_PAID", "FULLY_PAID"],
              },
            },
            include: {
              payments: {
                where: {
                  status: {
                    in: ["PAID", "FAILED"],
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function removeMemberAuthCookie() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}