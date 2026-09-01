import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

/* =========================
   GET SERVICE CONTENT
========================= */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
        name: true,
        thumbnailImage: true,
        coverImage: true,
        websiteContent: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.name,
        thumbnailImage: service.thumbnailImage,
        coverImage: service.coverImage,
      },
      content: service.websiteContent,
    });
  } catch (error) {
    console.error(
      "Fetch service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch service content.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE / UPDATE SERVICE CONTENT
========================= */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    const body = await req.json();

    const eyebrow =
      typeof body.eyebrow === "string"
        ? body.eyebrow.trim()
        : null;

    const heroTitle =
      typeof body.heroTitle === "string"
        ? body.heroTitle.trim()
        : null;

    const closing =
      typeof body.closing === "string"
        ? body.closing.trim()
        : null;

    const tagline =
      typeof body.tagline === "string"
        ? body.tagline.trim()
        : null;

    const intro =
      body.intro !== undefined
        ? body.intro
        : null;

    const benefits =
      body.benefits !== undefined
        ? body.benefits
        : null;

    const idealFor =
      body.idealFor !== undefined
        ? body.idealFor
        : null;

    const content =
      await prisma.serviceWebsiteContent.upsert({
        where: {
          serviceId,
        },
        create: {
          serviceId,
          eyebrow,
          heroTitle,
          intro,
          closing,
          tagline,
          benefits,
          idealFor,
        },
        update: {
          eyebrow,
          heroTitle,
          intro,
          closing,
          tagline,
          benefits,
          idealFor,
        },
      });

    return NextResponse.json({
      success: true,
      content,
    });
  } catch (error) {
    console.error(
      "Save service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save service content.",
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE SERVICE CONTENT
========================= */
export async function DELETE(
  _req: NextRequest,
  { params }: Params
) {
  const { id: serviceId } = await params;

  try {
    const service = await prisma.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        id: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          message: "Service not found.",
        },
        { status: 404 }
      );
    }

    await prisma.serviceWebsiteContent.deleteMany({
      where: {
        serviceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Service content deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete service content error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete service content.",
      },
      { status: 500 }
    );
  }
}
