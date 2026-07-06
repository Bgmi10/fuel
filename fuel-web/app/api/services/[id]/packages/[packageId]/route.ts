import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
    packageId: string;
  }>;
};

/* =========================
   UPDATE PACKAGE
========================= */
export const PUT = async (
  req: NextRequest,
  { params }: Params
) => {
  const { packageId } = await params;

  try {
    const {
      name,
      durationInDays,
      price,
      originalPrice,
      description,
      isActive
    } = await req.json();

    if (
      !name ||
      !durationInDays ||
      !price ||
      !originalPrice
    ) {
      return NextResponse.json({
        success: false,
        message:
          "name, durationInDays, price, originalPrice required",
      });
    }

    const updatedPackage = await prisma.servicePackage.update({
      where: {
        id: packageId,
      },
      data: {
        name,
        description,
        durationInDays,
        isActive,
        price,
        originalPrice,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPackage,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Failed to update package",
    });
  }
};

/* =========================
   DELETE PACKAGE
========================= */
export const DELETE = async (
  req: NextRequest,
  { params }: Params
) => {
  const { packageId } = await params;

  try {
    await prisma.servicePackage.delete({
      where: {
        id: packageId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Failed to delete package",
    });
  }
};

/* =========================
   GET SINGLE PACKAGE
========================= */
export const GET = async (
  req: NextRequest,
  { params }: Params
) => {
  const { packageId } = await params;

  try {
    const servicePackage = await prisma.servicePackage.findUnique({
      where: {
        id: packageId,
      },
    });

    return NextResponse.json({
      success: true,
      servicePackage,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Failed to fetch package",
    });
  }
};