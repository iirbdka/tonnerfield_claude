import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createMembershipSchema = z.object({
  coachId: z.string().min(1, "코치를 선택해야 합니다"),
  remainingMinutes: z.number().min(0, "시간은 0분 이상이어야 합니다"),
  expiresAt: z.string().min(1, "만료일을 선택해야 합니다"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await req.json()
    const validated = createMembershipSchema.parse(body)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "회원을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Check if coach exists
    const coach = await prisma.coach.findUnique({
      where: { id: validated.coachId },
    })

    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "코치를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Check if membership already exists
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_coachId: {
          userId,
          coachId: validated.coachId,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: { code: "ALREADY_EXISTS", message: "이미 해당 코치의 회원권이 존재합니다." } },
        { status: 400 }
      )
    }

    const membership = await prisma.$transaction(async (tx) => {
      // Create membership
      const newMembership = await tx.membership.create({
        data: {
          userId,
          coachId: validated.coachId,
          remainingMinutes: validated.remainingMinutes,
          expiresAt: new Date(validated.expiresAt),
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
      })

      // Create ledger entry
      await tx.membershipLedger.create({
        data: {
          membershipId: newMembership.id,
          deltaMinutes: validated.remainingMinutes,
          reason: "PURCHASE",
          createdByUserId: session.user.id,
        },
      })

      return newMembership
    })

    return NextResponse.json({
      message: "회원권이 발급되었습니다.",
      membership,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error creating membership:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "회원권 발급 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
