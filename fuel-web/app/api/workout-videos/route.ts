import {
    NextRequest,
    NextResponse,
  } from "next/server";
  
  import { prisma } from "@/prisma";
  
  
  export async function GET() {
    try {
      const videos =
        await prisma.workoutVideo.findMany({
          orderBy: {
            createdAt: "desc",
          },
        });
  
      return NextResponse.json({
        success: true,
        videos,
      });
    } catch (error) {
      console.error(
        "Load workout videos error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to load workout videos.",
        },
        {
          status: 500,
        }
      );
    }
  }
  
  export async function POST(
    request: NextRequest
  ) {
    try {
      const body = await request.json();
  
      const name =
        typeof body.name === "string"
          ? body.name.trim()
          : "";
  
      const videoUrl =
        typeof body.videoUrl === "string"
          ? body.videoUrl.trim()
          : "";
  
      const thumbnailUrl =
        typeof body.thumbnailUrl === "string" &&
        body.thumbnailUrl.trim()
          ? body.thumbnailUrl.trim()
          : null;
  
      const durationSeconds = Number(
        body.durationSeconds
      );
  
      if (!name) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Workout video name is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (!videoUrl) {
        return NextResponse.json(
          {
            success: false,
            message: "Video URL is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        !Number.isInteger(durationSeconds) ||
        durationSeconds <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "A valid video duration is required.",
          },
          {
            status: 400,
          }
        );
      }
  
      const video =
        await prisma.workoutVideo.create({
          data: {
            name,
            videoUrl,
            thumbnailUrl,
            durationSeconds,
          },
        });
  
      return NextResponse.json(
        {
          success: true,
          video,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      console.error(
        "Create workout video error:",
        error
      );
  
      return NextResponse.json(
        {
          success: false,
          message:
            "Unable to create workout video.",
        },
        {
          status: 500,
        }
      );
    }
  }