import { prisma } from "@/prisma";
import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  
  export const runtime = "nodejs";
  
  export async function PATCH(
    request: NextRequest,
    context: {
      params: Promise<{
        id: string;
      }>;
    }
  ) {
    try {
      const { id } = await context.params;
      const body = await request.json();
  
      if (typeof body.isActive !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message:
              "A valid active status is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      const video =
        await prisma.workoutVideo.update({
          where: {
            id,
          },
  
          data: {
            isActive: body.isActive,
          },
        });
  
      return NextResponse.json({
        success: true,
        video,
      });
    } catch (error) {
      console.error(
        "Update workout video error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to update workout video.",
        },
        {
          status: 500,
        }
      );
    }
  }
  
  export async function DELETE(
    _request: NextRequest,
    context: {
      params: Promise<{
        id: string;
      }>;
    }
  ) {
    try {
      const { id } = await context.params;
  
      const video =
        await prisma.workoutVideo.findUnique({
          where: {
            id,
          },
  
          include: {
            _count: {
              select: {
                programItems: true,
              },
            },
          },
        });
  
      if (!video) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Workout video was not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      if (video._count.programItems > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This video is being used in a workout program. Disable it instead of deleting it.",
          },
          {
            status: 409,
          }
        );
      }
  
      await prisma.workoutVideo.delete({
        where: {
          id,
        },
      });
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Delete workout video error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to delete workout video.",
        },
        {
          status: 500,
        }
      );
    }
  }