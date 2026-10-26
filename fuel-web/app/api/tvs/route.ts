import { NextRequest } from "next/server";

import { prisma } from "@/prisma";
import { tvQuerySchema } from "@/src/lib/tv/contracts-library";
import { handleError, ok, readQuery } from "@/src/lib/tv/http";

export async function GET(req: NextRequest) {
  try {
    const { branchId } = readQuery(req, tvQuerySchema);

    const devices = await prisma.tvDevice.findMany({
      where: { revokedAt: null, ...(branchId ? { branchId } : {}) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        branchId: true,
        isOnline: true,
        lastSeenAt: true,
        pairedAt: true,
        branch: { select: { name: true } },
      },
    });

    return ok(devices);
  } catch (error) {
    return handleError(error, "GET /api/tvs");
  }
}
