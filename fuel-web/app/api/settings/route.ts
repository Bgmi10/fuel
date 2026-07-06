import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    try {
        const setting = await prisma.setting.findFirst({});
        return NextResponse.json({ success: true, setting })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}