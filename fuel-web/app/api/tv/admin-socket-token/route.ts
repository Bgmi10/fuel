import { handleError, ok } from "@/src/lib/tv/http";
import { signAdminSocketToken } from "@/src/lib/tv/security";

/**
 * Must sit behind your normal admin authentication (middleware or a
 * session check here). A signed 5-minute token lets the browser
 * subscribe to live TV status over the socket.
 */
export async function GET() {
  try {
    return ok({ token: signAdminSocketToken() });
  } catch (error) {
    return handleError(error, "GET /api/tv/admin-socket-token");
  }
}
