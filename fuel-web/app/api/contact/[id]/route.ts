import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { status } = await req.json();

    if (!status) {
        return NextResponse.json({ success: false, message: 'Status is required field' });
    }

    try {
        await prisma.contactInquiry.update({
            where: { id },
            data: {
                status
            }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.log(e);
        return NextResponse.json({ success: false })
    }
}