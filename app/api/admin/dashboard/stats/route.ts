import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } },
        { status: 403 }
      )
    }

    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)
    const monthEnd = endOfMonth(today)

    // Fetch all stats in parallel
    const [
      totalUsers,
      totalCoaches,
      totalBranches,
      totalLessons,
      todayReservations,
      weekReservations,
      monthReservations,
    ] = await Promise.all([
      prisma.user.count({
        where: { role: "USER" },
      }),
      prisma.coach.count(),
      prisma.branch.count(),
      prisma.lesson.count(),
      prisma.reservation.count({
        where: {
          startAt: {
            gte: dayStart,
            lt: dayEnd,
          },
          status: {
            in: ["CONFIRMED", "ATTENDED"],
          },
        },
      }),
      prisma.reservation.count({
        where: {
          startAt: {
            gte: weekStart,
            lt: weekEnd,
          },
          status: {
            in: ["CONFIRMED", "ATTENDED"],
          },
        },
      }),
      prisma.reservation.count({
        where: {
          startAt: {
            gte: monthStart,
            lt: monthEnd,
          },
          status: {
            in: ["CONFIRMED", "ATTENDED"],
          },
        },
      }),
    ])

    return NextResponse.json({
      totalUsers,
      totalCoaches,
      totalBranches,
      totalLessons,
      todayReservations,
      weekReservations,
      monthReservations,
      totalRevenue: 0, // Placeholder for future revenue tracking
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "통계를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}