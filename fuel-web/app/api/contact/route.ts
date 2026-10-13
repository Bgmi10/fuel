
import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const {
      name,
      phone,
      email,
      message,
      preferredTimeToContact,
    } = await req.json();

    if (!phone || !name) {
      return NextResponse.json(
        { success: false, message: "Phone and name are required fields" },
        { status: 400 }
      );
    }

    await prisma.contactInquiry.create({
      data: {
        name,
        phone,
        email: email || null,
        message: message || null,
        preferredTimeToContact: preferredTimeToContact || null,
      },
    });

    // Trigger an email call here if needed.

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to create contact inquiry:", e);

    return NextResponse.json(
      { success: false, message: "Failed to create inquiry" },
      { status: 500 }
    );
  }
};

export const GET = async (_req: NextRequest) => {
  try {
    const contacts = await prisma.contactInquiry.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      inquiries: contacts,
    });
  } catch (e) {
    console.error("Failed to fetch contact inquiries:", e);

    return NextResponse.json(
      { success: false, message: "Failed to fetch inquiries" },
      { status: 500 }
    );
  }
};
