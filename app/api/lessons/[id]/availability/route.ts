import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateAvailability } from "@/lib/availability"
import { parseISO, startOfDay, endOfDay } from "date-fns"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = req.nextUrl.searchParams
    const dateStr = searchParams.get("date")

    if (!dateStr) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE", message: "날짜를 지정해주세요." } },
        { status: 400 }
      )
    }

    const date = parseISO(dateStr)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    // Get lesson with coach info
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        coach: {
          include: {
            availRules: true,
            timeOffs: {
              where: {
                OR: [
                  {
                    startAt: {
                      lte: dayEnd,
                    },
                    endAt: {
                      gte: dayStart,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "레슨을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Get existing reservations for this coach on this day
    const reservations = await prisma.reservation.findMany({
      where: {
        coachId: lesson.coachId,
        startAt: {
          gte: dayStart,
          lt: dayEnd,
        },
        status: {
          in: ["PENDING", "CONFIRMED", "ATTENDED", "HOLIDAY"],
        },
      },
    })

    const availability = calculateAvailability(
      date,
      lesson.coach.availRules,
      lesson.coach.timeOffs,
      reservations
    )

    return NextResponse.json(availability)
  } catch (error) {
    console.error("Error calculating availability:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "가용 시간 계산 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}