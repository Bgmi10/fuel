import {
    UserRole,
  } from "@prisma/client";
  
  import { prisma } from "@/prisma";
  import { sendEmail } from "@/src/lib/services/email";
  
  type LoggedInUser = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  
    branch?: {
      name: string;
    } | null;
  };
  
  type SendStaffLoginNotificationArguments = {
    user: LoggedInUser;
    request: Request;
  };
  
  const NOTIFIABLE_ROLES = new Set<UserRole>([
    UserRole.STAFF,
    UserRole.MANAGER,
    UserRole.COACH,
  ]);
  
  const getClientIp = (
    request: Request
  ) => {
    const forwardedFor =
      request.headers.get(
        "x-forwarded-for"
      );
  
    if (forwardedFor) {
      return (
        forwardedFor
          .split(",")[0]
          ?.trim() || "Unavailable"
      );
    }
  
    return (
      request.headers.get("x-real-ip") ??
      "Unavailable"
    );
  };
  
  export const sendStaffLoginNotification =
    async ({
      user,
      request,
    }: SendStaffLoginNotificationArguments) => {
      /*
       * Do not send notifications for ADMIN
       * or any future role not explicitly
       * included above.
       */
      if (!NOTIFIABLE_ROLES.has(user.role)) {
        return;
      }
  
      const templateId = 3
  
      if (
        !Number.isInteger(templateId) ||
        templateId <= 0
      ) {
        console.error(
          "BREVO_STAFF_LOGIN_TEMPLATE_ID is missing or invalid"
        );
  
        return;
      }
  
      const admins =
        await prisma.user.findMany({
          where: {
            role: UserRole.ADMIN,
          },
  
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
  
      if (admins.length === 0) {
        console.warn(
          "No ADMIN users found for staff login notification"
        );
  
        return;
      }
  
      const loggedInAt = new Date();
  
      const loginDate =
        new Intl.DateTimeFormat(
          "en-IN",
          {
            dateStyle: "long",
            timeZone: "Asia/Kolkata",
          }
        ).format(loggedInAt);
  
      const loginTime =
        new Intl.DateTimeFormat(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          }
        ).format(loggedInAt);
  
      const ipAddress =
        getClientIp(request);
  
      const userAgent =
        request.headers.get(
          "user-agent"
        ) ?? "Unavailable";
  
      const dashboardUrl = `${
        process.env.NEXT_PUBLIC_SITE_URL ??
        ""
      }/dashboard`;
  
      /*
       * allSettled ensures one failed recipient
       * does not prevent alerts from reaching
       * the remaining admins.
       */
      const emailResults =
        await Promise.allSettled(
          admins.map((admin) =>
            sendEmail({
              to: admin.email,
              name: admin.name,
  
              templateId,
  
              params: {
                adminName:
                  admin.name || "Admin",
  
                staffName:
                  user.name || "Staff Member",
  
                staffEmail: user.email,
  
                staffRole: user.role,
  
                branchName:
                  user.branch?.name ??
                  "Not assigned",
  
                loginDate,
                loginTime,
                ipAddress,
  
                device: userAgent.slice(
                  0,
                  250
                ),
  
                dashboardUrl,
              },
            })
          )
        );
  
      const failedEmails =
        emailResults.filter(
          (result) =>
            result.status === "rejected"
        );
  
      if (failedEmails.length > 0) {
        console.error(
          `${failedEmails.length} of ${admins.length} staff login notifications failed`
        );
      }
    };