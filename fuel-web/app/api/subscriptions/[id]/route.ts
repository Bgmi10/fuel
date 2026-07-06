import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;

    try {
        const subscription =  await prisma.subscription.findUnique({ where: { id },
        include: {
            invoice: {
                include: {
                    payments: true
                }
            }
        }
        });

        return NextResponse.json({ success: true, subscription });
    } catch (e) {
        return NextResponse.json({ success: false });
    }
}