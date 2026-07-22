import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { prisma } from "@/prisma";
  
  
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
  
      const program =
        await prisma.workoutProgram.update({
          where: {
            id,
          },
  
          data: {
            isActive: body.isActive,
          },
  
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
  
              include: {
                video: true,
              },
            },
  
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        });
  
      return NextResponse.json({
        success: true,
        program,
      });
    } catch (error) {
      console.error(
        "Update workout program error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to update workout program.",
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
  
      const program =
        await prisma.workoutProgram.findUnique({
          where: {
            id,
          },
  
          include: {
            _count: {
              select: {
                assignments: true,
              },
            },
          },
        });
  
      if (!program) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Workout program was not found.",
          },
          {
            status: 404,
          }
        );
      }
  
      if (program._count.assignments > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This program has branch assignments. Disable it instead of deleting it.",
          },
          {
            status: 409,
          }
        );
      }
  
      await prisma.workoutProgram.delete({
        where: {
          id,
        },
      });
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "Delete workout program error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to delete workout program.",
        },
        {
          status: 500,
        }
      );
    }
  }