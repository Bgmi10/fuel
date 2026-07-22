import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";
import { getCorsHeaders } from "@/src/lib/cors";
import { prisma } from "@/prisma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHARACTERS =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePairingCode(
  length = 6
): string {
  return Array.from(
    { length },
    () =>
      CHARACTERS[
        crypto.randomInt(
          0,
          CHARACTERS.length
        )
      ]
  ).join("");
}

export async function OPTIONS(
  request: NextRequest
) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(
  request: NextRequest
) {
  const corsHeaders =
    getCorsHeaders(request);

  try {
    let pairingCode =
      generatePairingCode();

    let availableCodeFound = false;

    for (
      let attempt = 0;
      attempt < 10;
      attempt += 1
    ) {
      const existingSession =
        await prisma.tvPairingSession.findUnique({
          where: {
            pairingCode,
          },
          select: {
            id: true,
          },
        });

      if (!existingSession) {
        availableCodeFound = true;
        break;
      }

      pairingCode =
        generatePairingCode();
    }

    if (!availableCodeFound) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to generate a unique pairing code.",
        },
        {
          status: 503,
          headers: corsHeaders,
        }
      );
    }

    const session =
      await prisma.tvPairingSession.create({
        data: {
          pairingCode,

          expiresAt: new Date(
            Date.now() +
              10 * 60 * 1000
          ),
        },
      });

    return NextResponse.json(
      {
        success: true,
        sessionId: session.id,
        pairingCode:
          session.pairingCode,
        expiresAt:
          session.expiresAt.toISOString(),
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(
      "Create TV pairing session error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to generate pairing code.",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}