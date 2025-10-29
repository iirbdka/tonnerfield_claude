import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { LessonCategory } from "@prisma/client"

const createLessonSchema = z.object({
  name: z.string().min(1, "레슨명은 필수입니다"),
  category: z.enum(["FITNESS", "YOGA", "PILATES", "TENNIS", "GOLF", "SWIMMING", "OTHER"]),
  description: z.string().optional(),
  durationMinutes: z.number().min(30, "레슨 시간은 최소 30분입니다"),
  maxParticipants: z.number().min(1, "최대 인원은 최소 1명입니다"),
  imageUrl: z.string().optional(),
  coachId: z.string().min(1, "코치를 선택해야 합니다"),
  branchId: z.string().min(1, "지점을 선택해야 합니다"),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } },
        { status: 403 }
      )
    }

    const lessons = await prisma.lesson.findMany({
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
        _count: {
          select: {
            reservations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(lessons)
  } catch (error) {
    console.error("Error fetching lessons:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다." } },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = createLessonSchema.parse(body)

    const lesson = await prisma.lesson.create({
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
      message: "레슨이 생성되었습니다.",
      lesson,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error creating lesson:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
