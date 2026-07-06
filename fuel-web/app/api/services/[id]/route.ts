import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   UPDATE SERVICE
========================= */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const { name, branchIds } = await req.json();

    if (!name || !Array.isArray(branchIds)) {
      return NextResponse.json({
        success: false,
        message: "name and branchIds required",
      });
    }

    const updatedService = await prisma.service.update({
      where: {
        id,
      },
      data: {
        name,

        // replace old branches with new ones
        branches: {
          set: [],

          connect: branchIds.map((branchId: string) => ({
            id: branchId,
          })),
        },
      },

      include: {
        branches: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedService,
    });
    } catch (error) {
        console.error(error);

        return NextResponse.json({
        success: false,
        message: "Failed to update service",
        });
    }
}

/* =========================
   DELETE SERVICE
========================= */
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  try {
    await prisma.service.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      success: false,
      message: "Failed to delete service",
    });
  }
}

export const GET = async (req: NextRequest, { params }: Params) => {
  const { id } = await params;

  try {
      const service = await prisma.service.findUnique({
          where: { id },
          
      });
      return NextResponse.json({ success: true, service });
  } catch (e) {
      console.log(e);
return NextResponse.json({
  success: false,
});
}
}