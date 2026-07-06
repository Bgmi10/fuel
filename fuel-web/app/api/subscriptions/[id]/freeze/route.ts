import { exclusiveEndDate, startOfDayUTC } from "@/app/utils/date";
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }>}) => {
    const { id } = await params;
    const { freezeStart, freezeEnd } = await req.json(); 
    const freezeStartFormat = startOfDayUTC(freezeStart);
    const freezeEndFormat = exclusiveEndDate(freezeEnd);

    
    const subscription = await prisma.subscription.findUnique({
        where: { id },
      });
    
      if (!subscription) {
        return NextResponse.json({ success: false }, { status: 404 });
      }
    
      if (subscription.status === "FROZEN") {
        return NextResponse.json(
          { success: false, message: "Already frozen" },
          { status: 400 }
        );
      }
      
    try {
        await prisma.subscription.update({
            where: { id },
            data: {
                freezeStart: freezeStartFormat,
                freezeEnd: freezeEndFormat,
                status: "FROZEN"
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false });
    }
} 