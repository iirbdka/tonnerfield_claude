import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { differenceInMinutes, parseISO } from "date-fns"

const createReservationSchema = z.object({
  lessonId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  goal: z.enum(["EASY", "NORMAL", "HARD"]).optional(),
  categoryTag: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const validated = createReservationSchema.parse(body)

    const startAt = parseISO(validated.startAt)
    const endAt = parseISO(validated.endAt)
    const durationMinutes = differenceInMinutes(endAt, startAt)

    // Validate time range
    if (durationMinutes <= 0) {
      return NextResponse.json(
        { error: { code: "INVALID_TIME_RANGE", message: "종료 시간은 시작 시간보다 뒤여야 합니다." } },
        { status: 400 }
      )
    }

    if (durationMinutes % 30 !== 0) {
      return NextResponse.json(
        { error: { code: "INVALID_DURATION", message: "예약 시간은 30분 단위여야 합니다." } },
        { status: 400 }
      )
    }

    // Get lesson details
    const lesson = await prisma.lesson.findUnique({
      where: { id: validated.lessonId },
      include: { coach: true, branch: true }
    })

    if (!lesson) {
      return NextResponse.json(
        { error: { code: "LESSON_NOT_FOUND", message: "레슨을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Check membership
    const membership = await prisma.membership.findUnique({
      where: {
        userId_coachId: {
          userId: session.user.id,
          coachId: lesson.coachId,
        },
      },
    })

    if (!membership || !membership.active) {
      return NextResponse.json(
        { error: { code: "NO_MEMBERSHIP", message: `${lesson.coach.name} 코치님의 회원권이 없습니다.` } },
        { status: 400 }
      )
    }

    // Check expiry
    if (membership.expiresAt < startAt) {
      return NextResponse.json(
        { error: { code: "MEMBERSHIP_EXPIRED", message: "회원권 기간이 만료되었습니다." } },
        { status: 400 }
      )
    }

    // Check remaining minutes
    if (membership.remainingMinutes < durationMinutes) {
      return NextResponse.json(
        { error: { code: "INSUFFICIENT_MINUTES", message: `${lesson.coach.name} 코치님의 회원권 잔여 시간이 부족합니다.` } },
        { status: 400 }
      )
    }

    // Create reservation in transaction
    const reservation = await prisma.$transaction(async (tx) => {
      // Create reservation
      const newReservation = await tx.reservation.create({
        data: {
          lessonId: validated.lessonId,
          userId: session.user.id,
          coachId: lesson.coachId,
          branchId: lesson.branchId,
          startAt,
          endAt,
          status: "CONFIRMED",
          goal: validated.goal,
          categoryTag: validated.categoryTag,
        },
      })

      // Deduct minutes from membership
      await tx.membership.update({
        where: { id: membership.id },
        data: {
          remainingMinutes: {
            decrement: durationMinutes,
          },
        },
      })

      // Create ledger entry
      await tx.membershipLedger.create({
        data: {
          membershipId: membership.id,
          deltaMinutes: -durationMinutes,
          reason: "BOOKING",
          reservationId: newReservation.id,
          createdByUserId: session.user.id,
        },
      })

      return newReservation
    })

    return NextResponse.json(
      {
        message: "예약이 확정되었습니다.",
        reservation,
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

    // Check for database constraint violations
    if (error instanceof Error && error.message.includes("no_overlap_per_coach")) {
      return NextResponse.json(
        { error: { code: "TIME_CONFLICT", message: "해당 시간은 이미 예약되어 있습니다." } },
        { status: 409 }
      )
    }

    console.error("Reservation creation error:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "예약 처리 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get("status")

    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        lesson: {
          include: {
            coach: true,
            branch: true,
          },
        },
      },
      orderBy: {
        startAt: "desc",
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