import { NextRequest } from "next/server";

import { broadcastInputSchema, broadcastQuerySchema } from "@/src/lib/tv/contracts";
import { createBroadcast, listBroadcasts } from "@/src/lib/tv/broadcast-service";
import { handleError, ok, readBody, readQuery } from "@/src/lib/tv/http";


export async function GET(req: NextRequest) {
  try {
    const query = readQuery(req, broadcastQuerySchema);
    return ok(await listBroadcasts(query));
  } catch (error) {
    return handleError(error, "GET /api/workout-broadcasts");
  }
}

export async function POST(req: NextRequest) {
  try {
    const input = await readBody(req, broadcastInputSchema);
    return ok(await createBroadcast(input), 201);
  } catch (error) {
    return handleError(error, "POST /api/workout-broadcasts");
  }
}
