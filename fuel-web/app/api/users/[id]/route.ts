import { prisma } from "@/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET SINGLE USER
export const GET = async (
  req: NextRequest,
  { params }: Params
) => {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            payrolls: true,
            attendances: {
              orderBy: {
                date: "asc"
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// EDIT USER
export const PUT = async (
  req: NextRequest,
  { params }: Params
) => {
  try {
    const { id } = await params;

    const { name, email, role, password } =
      await req.json();

    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    if (role !== undefined) {
      updateData.role = role;
    }

    if (password !== undefined) {
      const hashPass = await bcrypt.hash(password, 10);

      updateData.password = hashPass;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Failed to update user",
    });
  }
};

// DELETE USER
export const DELETE = async (
  req: NextRequest,
  { params }: Params
) => {
  try {
    const { id } = await params;

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (e) {
    console.log(e);

    return NextResponse.json({
      success: false,
      message: "Failed to delete user",
    });
  }
};