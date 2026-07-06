import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

export const GET = async (req: NextRequest) => {
    try {
        const users = await prisma.user.findMany({});

        return NextResponse.json({ success: true, users })
    } catch (e) {
        return NextResponse.json({ success: false });
    }
}

export const POST = async (req: NextRequest) => {
    const { name, email, role, password } = await req.json();

    if (!name || !email || !role || !password) {
     return NextResponse.json({ success: false, message: "name, email, role required fields" });
    }

    try {
        const hashPass = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: {
                name,
                email,
                role,
                password: hashPass
            }
        })

        return NextResponse.json({ success: true })
    } catch (e) {
        console.log(e);
        return NextResponse.json({ success: false });
    }
}