import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server"

export const POST = async (req: NextRequest) => {
    const { name, branchIds,  } = await req.json();

if (!name || !branchIds || !Array.isArray(branchIds)) {
  return NextResponse.json({
    success: false,
    message: "service name and branchIds array required",
  });
}

try {
  const service = await prisma.service.create({
    data: {
      name,
      branches: {
        connect: branchIds.map((id: string) => ({
          id,
        })),
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: service,
  });
} catch (error) {
  console.error(error);

  return NextResponse.json({
    success: false,
    message: "Failed to create service",
  });
}
}

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId");

  try {
        const services = await prisma.service.findMany({
           where: branchId ? {
             branches: {
              some: {
                id: branchId
              }
             }
           } : undefined,
            include: {
                branches: true,
                packages: {
                  include: {
                    coupons: {
                      where: {
                        isPrivate: false,
                        expiresAt:  {
                          gte: new Date()
                        }
                      }
                    }
                  }
                },
                _count: {
                  select: {
                    packages: true
                  }
                }
            },
            
        });
        return NextResponse.json({ success: true, services });
    } catch (e) {
        console.log(e);
  return NextResponse.json({
    success: false,
  });
}
}