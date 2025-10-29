import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        _count: {
          select: {
            reservations: true,
            memberships: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "프로필을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}