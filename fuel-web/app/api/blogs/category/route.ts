import { prisma } from "@/prisma"
import { NextRequest, NextResponse } from "next/server";

export const GET = async () => {
    try {
        const cat = await prisma.blogCategory.findMany({});

        return NextResponse.json({ success: true, cat })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}

export const POST = async (req: NextRequest) => {
    const { name } = await req.json();

    try {
        await prisma.blogCategory.create({ data: { name }});
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ success: false })
    }
}