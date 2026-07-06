import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const PATCH = async (req: NextRequest, { params }:  { params: Promise<{ id: string }> }) => {
    const { scheduledDate } = await req.json();
    const { id } = await params;

    if (!id || !scheduledDate) {
        return NextResponse.json({ success: false, message: "id and schedule date is required "});
    }

    try {
        await prisma.trialBooking.update({
            where: { id },
            data: {
                scheduledDate,
                status: "SCHEDULED"
            }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.log(e);
        return NextResponse.json({ success: false });
    }
}