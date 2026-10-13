import { NextRequest, NextResponse } from "next/server";

import { getUserFromRequest } from "@/app/utils/auth";
import { listMembers } from "@/src/lib/member-list";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const user = await getUserFromRequest(request);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "You must be logged in." },
        { status: 401 }
      );
    }

    const members = await listMembers("active", user.branchId ?? null);

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error("Failed to load active members:", error);

    return NextResponse.json(
      { success: false, message: "Failed to load members." },
      { status: 500 }
    );
  }
};