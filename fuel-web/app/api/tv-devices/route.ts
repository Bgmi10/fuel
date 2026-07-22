import { prisma } from "@/prisma";
import { NextResponse } from "next/server";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    /*
     * Add your existing dashboard authentication
     * and role validation here.
     */

    const devices =
      await prisma.tvDevice.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          branch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      devices,
    });
  } catch (error) {
    console.error(
      "Load TV devices error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to load TV devices.",
      },
      {
        status: 500,
      }
    );
  }
}