import { prisma } from "@/prisma";
import { NextResponse } from "next/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const slot = await prisma.slot.findUnique({
      where: { id },
      include: {
        branch: true,
        package: true,
        bookings: {
            include: {
                slot: true,
                member: true,
                branch: true,
                subscription: true
            }
        },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(slot);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slot" },
      { status: 500 }
    );
  }
}

// UPDATE slot
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

  try {
    const body = await req.json();

    const updated = await prisma.slot.update({
      where: { id },
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        capacity: body.capacity ? Number(body.capacity) : undefined,
        branchId: body.branchId,
        packageId: body.packageId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update slot" },
      { status: 500 }
    );
  }
}

// SOFT DELETE (mark inactive)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
  try {
    const deleted = await prisma.slot.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: "Slot deactivated successfully",
      slot: deleted,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete slot" },
      { status: 500 }
    );
  }
}