import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { prisma } from "@/prisma";
  
  
  export async function GET() {
    try {
      const programs =
        await prisma.workoutProgram.findMany({
          orderBy: {
            createdAt: "desc",
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
        programs,
      });
    } catch (error) {
      console.error(
        "Load workout programs error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to load workout programs.",
        },
        {
          status: 500,
        }
      );
    }
  }
  
  type CreateProgramBody = {
    name?: string;
    description?: string;
    items?: Array<{
      videoId?: string;
    }>;
  };
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const body =
        (await request.json()) as CreateProgramBody;
  
      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";
  
      const description =
        typeof body.description === "string" &&
        body.description.trim()
          ? body.description.trim()
          : null;
  
      const items = Array.isArray(body.items)
        ? body.items
        : [];
  
      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Workout program name is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      const videoIds = items
        .map((item) =>
          typeof item.videoId === "string"
            ? item.videoId.trim()
            : ""
        )
        .filter(Boolean);
  
      if (videoIds.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Add at least one workout video.",
          },
          {
            status: 400,
          }
        );
      }
  
      const uniqueVideoIds = [
        ...new Set(videoIds),
      ];
  
      const existingVideos =
        await prisma.workoutVideo.findMany({
          where: {
            id: {
              in: uniqueVideoIds,
            },
            isActive: true,
          },
  
          select: {
            id: true,
          },
        });
  
      const existingVideoIds = new Set(
        existingVideos.map((video) => video.id)
      );
  
      const missingVideo = videoIds.find(
        (videoId) =>
          !existingVideoIds.has(videoId)
      );
  
      if (missingVideo) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more selected videos are unavailable.",
          },
          {
            status: 400,
          }
        );
      }
  
      const program =
        await prisma.workoutProgram.create({
          data: {
            name,
            description,
  
            items: {
              create: videoIds.map(
                (videoId, index) => ({
                  videoId,
                  sortOrder: index + 1,
                })
              ),
            },
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
  
      return NextResponse.json(
        {
          success: true,
          program,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      console.error(
        "Create workout program error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to create workout program.",
        },
        {
          status: 500,
        }
      );
    }
  }