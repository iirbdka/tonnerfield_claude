import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const deleteSchema = z.object({
  timeOffId: z.string(),
})

export async function DELETE(
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

    const { id: coachId } = await params
    const { searchParams } = req.nextUrl
    const timeOffId = searchParams.get("timeOffId")

    if (!timeOffId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "timeOffId is required" } },
        { status: 400 }
      )
    }

    await prisma.coachTimeOff.delete({
      where: {
        id: timeOffId,
        coachId,
      },
    })

    return NextResponse.json({
      message: "휴무가 삭제되었습니다.",
    })
  } catch (error) {
    console.error("Error deleting time-off:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "휴무 삭제 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
