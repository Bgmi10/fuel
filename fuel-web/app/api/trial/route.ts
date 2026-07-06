import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const { name, phone, time, goal } = await req.json();

    if (!phone || !name) {
        return NextResponse.json({ message: "phone and name required fields" });
    }

    try {
        await prisma.trialBooking.create({
            data: {
                name,
                preferredTime: time,
                phone,
                goal
            }
        });

        // trigger an email call

        return NextResponse.json({ success: true });
    } catch (e) {
        console.log(e)
        return NextResponse.json({ success: false });
    }
}

export const GET = async (req: NextRequest) => {
    try {
        const trials = await prisma.trialBooking.findMany({});
        return NextResponse.json({ success: true, trials: trials });
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}