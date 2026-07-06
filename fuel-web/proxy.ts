import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const memberToken = request.cookies.get("member-auth-token")?.value;

  const path = request.nextUrl.pathname;

  // MEMBER AUTH

  const isMemberLogin = path === "/member/login";
  const isMemberRoute = path.startsWith("/member");

  // Protect member routes except login
  if (isMemberRoute && !isMemberLogin && !memberToken) {
    return NextResponse.redirect(
      new URL("/member/login", request.url)
    );
  }

  // Prevent logged-in members from visiting login
  if (isMemberLogin && memberToken) {
    return NextResponse.redirect(
      new URL("/member/dashboard", request.url)
    );
  }

  // ADMIN AUTH

  const isAdminLogin = path === "/admin/login";

  // Protect dashboard
  if (path.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(
      new URL("/admin/login", request.url)
    );
  }

  // Prevent logged-in admin from visiting login
  if (isAdminLogin && token) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/member/:path*",
  ],
};