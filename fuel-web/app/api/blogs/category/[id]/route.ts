import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;

    if (!id) {
        return NextResponse.json({ success: false, message: "Id is required" });
    }

    try {
       await prisma.blogCategory.delete({ where: { id }});

        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}