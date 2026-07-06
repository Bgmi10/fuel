import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
    params: Promise<{
      id: string;
    }>;
  };
export const POST = async (req: NextRequest, { params }: Params) => {
    const {id } = await params;
    const { name, durationInDays, price, originalPrice, description, isActive } = await req.json();

    if (!name || !durationInDays || !price || !originalPrice) {
        return NextResponse.json({ success: false, message: "name, duration, price, originalprice is required fields" });
    }

    try {
        await prisma.servicePackage.create({
            data: {
                serviceId: id,
                name,
                description,
                durationInDays,
                price,
                isActive,
                originalPrice,
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error(error);
    
        return NextResponse.json({
          success: false,
          message: "Failed to update service",
        });
      }
}


export const GET = async (req: NextRequest, { params }: Params) => {
    const {id } = await params;

    try {
        const packages = await prisma.servicePackage.findMany({
            where: {
                serviceId: id
            }
        });
        return NextResponse.json({ success: true, packages });
    } catch (e) {
        console.log(e);
  return NextResponse.json({
    success: false,
  });
}
}