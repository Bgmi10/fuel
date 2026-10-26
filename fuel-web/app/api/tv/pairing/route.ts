import { handleError, ok } from "@/src/lib/tv/http";
import { createPairingSession } from "@/src/lib/tv/tv-service";

/** Unauthenticated by design: a TV asks for a code before it has any credentials. */
export async function POST() {
  try {
    return ok(await createPairingSession(), 201);
  } catch (error) {
    return handleError(error, "POST /api/tv/pairing");
  }
}
