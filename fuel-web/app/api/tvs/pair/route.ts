import { NextRequest } from "next/server";

import { getSocketServer } from "@/src/lib/socket-runtime";
import { tvPairSchema } from "@/src/lib/tv/contracts-library";
import { handleError, ok, readBody } from "@/src/lib/tv/http";
import { completePairing } from "@/src/lib/tv/tv-service";

/** Admin enters the code shown on the TV, names it and picks the branch. */
export async function POST(req: NextRequest) {
  try {
    const input = await readBody(req, tvPairSchema);
    return ok(await completePairing(getSocketServer(), input), 201);
  } catch (error) {
    return handleError(error, "POST /api/tvs/pair");
  }
}
