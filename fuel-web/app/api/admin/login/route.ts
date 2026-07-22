import {
  createToken,
  setAuthCookie,
} from "@/app/utils/auth";

import {
  sendStaffLoginNotification,
} from "@/app/services/staff-login-notification";

import { prisma } from "@/prisma";

import {
  User,
  UserRole,
} from "@prisma/client";

import bcrypt from "bcrypt";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const POST = async (
  req: NextRequest
) => {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email
            .trim()
            .toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email and password are required",
        },
        {
          status: 400,
        }
      );
    }

    const findUser =
      await prisma.user.findUnique({
        where: {
          email,
        },

        include: {
          branch: {
            select: {
              name: true,
            },
          },
        },
      });

    /*
     * Use the same message for an unknown
     * email and an incorrect password.
     */
    if (!findUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    const validPassword =
      await bcrypt.compare(
        password,
        findUser.password
      );

    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password",
        },
        {
          status: 401,
        }
      );
    }

    const payload: Partial<User> = {
      id: findUser.id,
      email: findUser.email,
      name: findUser.name,
      role: findUser.role,
    };

    const token =
      await createToken(payload);

    await setAuthCookie(token);

    /*
     * ADMIN logins do not trigger alerts.
     */
    const shouldNotifyAdmins = [
      UserRole.STAFF,
      UserRole.MANAGER,
      UserRole.COACH,
      //@ts-ignore
    ].includes(findUser.role);

    if (shouldNotifyAdmins) {
      try {
        /*
         * Await the operation because serverless
         * execution may stop after the response.
         *
         * Notification errors are caught so they
         * never prevent a valid user login.
         */
        await sendStaffLoginNotification({
          user: {
            id: findUser.id,
            name: findUser.name,
            email: findUser.email,
            role: findUser.role,
            branch: findUser.branch,
          },

          request: req,
        });
      } catch (notificationError) {
        console.error(
          "Staff login notification failed:",
          notificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: findUser.id,
        name: findUser.name,
        email: findUser.email,
        role: findUser.role,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to process login",
      },
      {
        status: 500,
      }
    );
  }
};