import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELED", "HOLIDAY"]).optional(),
})

export async function PATCH(
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

    const { id } = await params
    const body = await req.json()
    const validated = updateSchema.parse(body)

    const reservation = await prisma.reservation.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json({
      message: "예약 정보가 업데이트되었습니다.",
      reservation,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "입력값이 올바르지 않습니다." } },
        { status: 400 }
      )
    }

    console.error("Error updating reservation:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "예약 업데이트 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}