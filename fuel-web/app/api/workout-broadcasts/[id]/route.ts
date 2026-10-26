import { NextRequest } from "next/server";

import {
  deleteBroadcast,
  loadBroadcast,
  updateBroadcast,
} from "@/src/lib/tv/broadcast-service";
import { broadcastInputSchema } from "@/src/lib/tv/contracts";
import { handleError, ok, readBody, type IdParams } from "@/src/lib/tv/http";

export async function GET(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    return ok(await loadBroadcast(id));
  } catch (error) {
    return handleError(error, "GET /api/workout-broadcasts/[id]");
  }
}

/** Full replacement of fields, exercises and TV selections in one transaction. */
export async function PUT(req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    const input = await readBody(req, broadcastInputSchema);
    return ok(await updateBroadcast(id, input));
  } catch (error) {
    return handleError(error, "PUT /api/workout-broadcasts/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: IdParams) {
  try {
    const { id } = await params;
    await deleteBroadcast(id);
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error, "DELETE /api/workout-broadcasts/[id]");
  }
}
