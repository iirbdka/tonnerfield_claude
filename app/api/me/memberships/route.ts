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

    const memberships = await prisma.membership.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
      orderBy: [
        {
          active: 'desc',
        },
        {
          expiresAt: 'asc',
        },
      ],
    })

    return NextResponse.json(memberships)
  } catch (error) {
    console.error("Error fetching memberships:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "회원권 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}