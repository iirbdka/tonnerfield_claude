import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(8).max(64),
  profile: z.object({
    name: z.string().min(1).max(50),
    gender: z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
    birthdate: z.string().optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = registerSchema.parse(body)

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: validated.username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: { code: "USERNAME_EXISTS", message: "이미 사용중인 아이디입니다." } },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10)

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        username: validated.username,
        passwordHash,
        profile: {
          create: {
            name: validated.profile.name,
            gender: validated.profile.gender || "UNKNOWN",
            birthdate: validated.profile.birthdate ? new Date(validated.profile.birthdate) : null,
            phone: validated.profile.phone,
            avatarUrl: validated.profile.avatarUrl,
          },
        },
      },
      include: {
        profile: true,
      },
    })

    // Remove sensitive data
    const { passwordHash: _, ...userWithoutPassword } = user

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다.",
        user: userWithoutPassword,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "입력값이 올바르지 않습니다.", details: error.errors } },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "회원가입 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}