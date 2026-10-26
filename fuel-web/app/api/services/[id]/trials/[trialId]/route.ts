import { prisma } from "@/prisma";
import { validateTrial } from "@/src/lib/validate-trail";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string; trialId: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  // TODO: same auth check as your subcategories route
  const { id, trialId } = await params;

  try {
    const body = await req.json();

    const existing = await prisma.serviceTrial.findFirst({
      where: { id: trialId, serviceId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Trial not found" },
        { status: 404 }
      );
    }

    const result = await validateTrial({
      serviceId: id,
      subCategoryId:
        "subCategoryId" in body ? body.subCategoryId : existing.subCategoryId,
      days: "days" in body ? body.days : existing.days,
      sellingPrice:
        "sellingPrice" in body ? body.sellingPrice : existing.sellingPrice,
      originalPrice:
        "originalPrice" in body ? body.originalPrice : existing.originalPrice,
      excludeId: trialId,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    const trial = await prisma.serviceTrial.update({
      where: { id: trialId },
      data: {
        ...result.data,
        isActive:
          typeof body.isActive === "boolean"
            ? body.isActive
            : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, trial });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to update trial" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  // TODO: same auth check as your subcategories route
  const { id, trialId } = await params;

  try {
    const result = await prisma.serviceTrial.deleteMany({
      where: { id: trialId, serviceId: id },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, message: "Trial not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to delete trial" },
      { status: 500 }
    );
  }
}