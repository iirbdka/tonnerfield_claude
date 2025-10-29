import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } },
        { status: 403 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get("search")

    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { profile: { name: { contains: search, mode: "insensitive" } } },
        { profile: { phone: { contains: search } } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        memberships: {
          where: {
            active: true,
          },
          include: {
            coach: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            reservations: true,
            memberships: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "회원 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
