import { createToken, setAuthCookie } from "@/app/utils/auth";
import { prisma } from "@/prisma";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, message: "email, password required fields" });
  }

    const findUser = await prisma.user.findUnique({ where: { email }});
    
    if (!findUser) {
        return NextResponse.json({ success: false, message: "user not found "});
    }

    try {
        const validPassword = await bcrypt.compare(password, findUser.password);

        if (!validPassword) {
            return NextResponse.json({ success: false, message: "invalid password" });
        }

        const payload: Partial<User> = {
            id: findUser.id,
            email:findUser.email,
            name: findUser.name,
            role: findUser.role,
          };
      
          // Generate JWT token
          const token = await createToken(payload);
          
          // Set auth cookie
          await setAuthCookie(token);

          return NextResponse.json({ success: true });
    } catch (e) {
        console.log(e);
        return NextResponse.json({ success: false })
    }
}
