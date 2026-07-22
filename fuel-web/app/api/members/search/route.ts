import { prisma } from "@/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const query = searchParams.get("q")?.trim() || "";
    const excludeMemberId =
      searchParams.get("excludeMemberId")?.trim() || "";

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        members: [],
      });
    }

    const where: Prisma.MemberWhereInput = {
      status: "ACTIVE",

      ...(excludeMemberId
        ? {
            id: {
              not: excludeMemberId,
            },
          }
        : {}),

      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: query,
          },
        },
        {
          email: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    };

    const members = await prisma.member.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Member search failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to search members.",
      },
      {
        status: 500,
      }
    );
  }
}