import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateCoachSchema = z.object({
  name: z.string().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bio: z.string().optional(),
  specialty: z.string().min(1).optional(),
  imageUrl: z.string().optional(),
  branchIds: z.array(z.string()).optional(),
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

    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
        lessons: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        availRules: true,
        timeOffs: true,
        _count: {
          select: {
            lessons: true,
            reservations: true,
            memberships: true,
          },
        },
      },
    })

    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "코치를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    return NextResponse.json(coach)
  } catch (error) {
    console.error("Error fetching coach:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "코치 정보를 불러오는 중 오류가 발생했습니다." } },
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
    const validated = updateCoachSchema.parse(body)

    const { branchIds, ...coachData } = validated

    // If branchIds are provided, update the branch relationships
    const updateData: any = coachData

    if (branchIds) {
      // Delete existing branch relationships and create new ones
      await prisma.coachBranch.deleteMany({
        where: { coachId: id },
      })

      updateData.branches = {
        create: branchIds.map((branchId) => ({
          branchId,
        })),
      }
    }

    const coach = await prisma.coach.update({
      where: { id },
      data: updateData,
      include: {
        branches: {
          include: {
            branch: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: "코치 정보가 업데이트되었습니다.",
      coach,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error updating coach:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "코치 업데이트 중 오류가 발생했습니다." } },
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

    // Check if coach has lessons or reservations
    const coach = await prisma.coach.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
            reservations: true,
          },
        },
      },
    })

    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "코치를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (coach._count.lessons > 0 || coach._count.reservations > 0) {
      return NextResponse.json(
        { error: { code: "HAS_DEPENDENCIES", message: "레슨이나 예약이 있는 코치는 삭제할 수 없습니다." } },
        { status: 400 }
      )
    }

    await prisma.coach.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "코치가 삭제되었습니다.",
    })
  } catch (error) {
    console.error("Error deleting coach:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "코치 삭제 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
