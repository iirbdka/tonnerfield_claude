import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Gender } from "@prisma/client"

const createCoachSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  bio: z.string().optional(),
  specialty: z.string().min(1, "전문 분야는 필수입니다"),
  imageUrl: z.string().optional(),
  branchIds: z.array(z.string()).min(1, "최소 1개 이상의 지점을 선택해야 합니다"),
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

    const coaches = await prisma.coach.findMany({
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            reservations: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(coaches)
  } catch (error) {
    console.error("Error fetching coaches:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "코치 목록을 불러오는 중 오류가 발생했습니다." } },
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
    const validated = createCoachSchema.parse(body)

    const { branchIds, ...coachData } = validated

    const coach = await prisma.coach.create({
      data: {
        ...coachData,
        branches: {
          create: branchIds.map((branchId) => ({
            branchId,
          })),
        },
      },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: "코치가 생성되었습니다.",
      coach,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error creating coach:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "코치 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
