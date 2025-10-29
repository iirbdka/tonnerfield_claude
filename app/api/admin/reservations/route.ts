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
    const status = searchParams.get("status")

    const where: any = {}
    if (status && status !== "all") {
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        lesson: {
          select: {
            name: true,
            category: true,
          },
        },
        user: {
          include: {
            profile: true,
          },
        },
        coach: {
          select: {
            name: true,
            phone: true,
          },
        },
        branch: {
          select: {
            name: true,
            address: true,
          },
        },
        feedback: true,
      },
      orderBy: {
        startAt: 'desc',
      },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error("Error fetching reservations:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "예약 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}