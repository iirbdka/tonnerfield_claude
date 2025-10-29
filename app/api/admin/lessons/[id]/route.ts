import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateLessonSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["FITNESS", "YOGA", "PILATES", "TENNIS", "GOLF", "SWIMMING", "OTHER"]).optional(),
  description: z.string().optional(),
  durationMinutes: z.number().min(30).optional(),
  maxParticipants: z.number().min(1).optional(),
  imageUrl: z.string().optional(),
  coachId: z.string().optional(),
  branchId: z.string().optional(),
})

export async function GET(
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

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        coach: true,
        branch: true,
        reservations: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    name: true,
                    phone: true,
                  },
                },
              },
            },
          },
          orderBy: {
            startAt: "desc",
          },
          take: 10,
        },
        _count: {
          select: {
            reservations: true,
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

    return NextResponse.json(lesson)
  } catch (error) {
    console.error("Error fetching lesson:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 정보를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

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
    const validated = updateLessonSchema.parse(body)

    const lesson = await prisma.lesson.update({
      where: { id },
      data: validated,
      include: {
        coach: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: "레슨 정보가 업데이트되었습니다.",
      lesson,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error updating lesson:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 업데이트 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

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

    const { id } = await params

    // Check if lesson has upcoming reservations
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            startAt: {
              gte: new Date(),
            },
            status: {
              in: ["PENDING", "CONFIRMED"],
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

    if (lesson.reservations.length > 0) {
      return NextResponse.json(
        { error: { code: "HAS_RESERVATIONS", message: "예정된 예약이 있는 레슨은 삭제할 수 없습니다." } },
        { status: 400 }
      )
    }

    await prisma.lesson.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "레슨이 삭제되었습니다.",
    })
  } catch (error) {
    console.error("Error deleting lesson:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 삭제 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
