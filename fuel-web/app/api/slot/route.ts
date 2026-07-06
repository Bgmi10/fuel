import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

// GET all slots (only active)
export async function GET() {
  try {
    const slots = await prisma.slot.findMany({
      where: {
        isActive: true,
      },
      include: {
        branch: true,
        package: {
            include: {
                service: true
            }
        },
        _count: {
            select: {
                bookings:true
            }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}

// CREATE slot
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      branchId,
      packageId,
      name,
      startTime,
      endTime,
      capacity,
    } = body;

    const slot = await prisma.slot.create({
      data: {
        branchId,
        packageId,
        name,
        startTime,
        endTime,
        capacity: Number(capacity),
      },
    });

    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create slot" },
      { status: 500 }
    );
  }
}