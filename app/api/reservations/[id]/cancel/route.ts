import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { differenceInMinutes } from "date-fns"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get reservation details
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            coach: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "예약을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Check ownership
    if (reservation.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "본인의 예약만 취소할 수 있습니다." } },
        { status: 403 }
      )
    }

    // Check if already canceled
    if (reservation.status === "CANCELED") {
      return NextResponse.json(
        { error: { code: "ALREADY_CANCELED", message: "이미 취소된 예약입니다." } },
        { status: 400 }
      )
    }

    // Check if can be canceled (only PENDING or CONFIRMED)
    if (!["PENDING", "CONFIRMED"].includes(reservation.status)) {
      return NextResponse.json(
        { error: { code: "CANNOT_CANCEL", message: "취소할 수 없는 상태의 예약입니다." } },
        { status: 400 }
      )
    }

    // Check if not past reservation
    if (new Date(reservation.startAt) < new Date()) {
      return NextResponse.json(
        { error: { code: "PAST_RESERVATION", message: "이미 지난 예약은 취소할 수 없습니다." } },
        { status: 400 }
      )
    }

    const durationMinutes = differenceInMinutes(
      new Date(reservation.endAt),
      new Date(reservation.startAt)
    )

    // Cancel reservation and restore membership minutes in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update reservation status
      const updatedReservation = await tx.reservation.update({
        where: { id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
        },
      })

      // Find membership
      const membership = await tx.membership.findUnique({
        where: {
          userId_coachId: {
            userId: session.user.id,
            coachId: reservation.coachId,
          },
        },
      })

      if (membership) {
        // Restore minutes
        await tx.membership.update({
          where: { id: membership.id },
          data: {
            remainingMinutes: {
              increment: durationMinutes,
            },
          },
        })

        // Create refund ledger entry
        await tx.membershipLedger.create({
          data: {
            membershipId: membership.id,
            deltaMinutes: durationMinutes,
            reason: "CANCEL_REFUND",
            reservationId: reservation.id,
            createdByUserId: session.user.id,
          },
        })
      }

      return updatedReservation
    })

    return NextResponse.json({
      message: "예약이 취소되었습니다.",
      reservation: result,
    })
  } catch (error) {
    console.error("Cancel reservation error:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "예약 취소 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}