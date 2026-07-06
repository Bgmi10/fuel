import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
    const { name, phone, email, message } = await req.json();

    if (!phone || !name) {
        return NextResponse.json({ message: "phone and name required fields" });
    }

    try {
        await prisma.contactInquiry.create({
            data: {
                name,
                email,
                phone,
                message
            }
        });

        // trigger an email call. 

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false });
    }
}

export const GET = async (req: NextRequest) => {
    try {
        const contacts = await prisma.contactInquiry.findMany({})

        return NextResponse.json({ success: true, inquiries: contacts })
    } catch (e) {
        console.log(e);
        return NextResponse.json({ success: false })
    }
}