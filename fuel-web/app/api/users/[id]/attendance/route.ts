import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {

    const { employeeId, date, checkIn, checkOut, status } = await req.json();

    try {
        await prisma.attendance.create({
            data: {
                checkIn,
                checkOut,
                status,
                date,
                employee: {
                connect: {
                id: employeeId
            }
        }
    }
        })

        return NextResponse.json({
            success: true,
          });
    } catch (e) {
        console.log(e);
        return NextResponse.json(
            {
              success: false,
              message: "Failed to update user",
            },
            { status: 500 }
          );
    }
}