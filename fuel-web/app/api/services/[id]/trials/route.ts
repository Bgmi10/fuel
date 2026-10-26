import { prisma } from "@/prisma";
import { validateTrial } from "@/src/lib/validate-trail";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  // TODO: same auth check as your subcategories route
  const { id } = await params;

  try {
    const trials = await prisma.serviceTrial.findMany({
      where: { serviceId: id },
      include: { subCategory: { select: { id: true, name: true } } },
      orderBy: [{ days: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, trials });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to load trials" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Ctx) {
  // TODO: same auth check as your subcategories route
  const { id } = await params;

  try {
    const body = await req.json();

    const service = await prisma.service.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: "Service not found" },
        { status: 404 }
      );
    }

    const result = await validateTrial({
      serviceId: id,
      subCategoryId: body.subCategoryId,
      days: body.days,
      sellingPrice: body.sellingPrice,
      originalPrice: body.originalPrice,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    const trial = await prisma.serviceTrial.create({
      data: {
        serviceId: id,
        ...result.data,
        isActive: body.isActive !== false,
      },
    });

    return NextResponse.json({ success: true, trial });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to create trial" },
      { status: 500 }
    );
  }
}