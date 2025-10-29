import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  description: z.string().optional(),
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

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        coaches: {
          include: {
            coach: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
        },
        lessons: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        _count: {
          select: {
            coaches: true,
            lessons: true,
            reservations: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "지점을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    return NextResponse.json(branch)
  } catch (error) {
    console.error("Error fetching branch:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "지점 정보를 불러오는 중 오류가 발생했습니다." } },
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
    const validated = updateBranchSchema.parse(body)

    const branch = await prisma.branch.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json({
      message: "지점 정보가 업데이트되었습니다.",
      branch,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error updating branch:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "지점 업데이트 중 오류가 발생했습니다." } },
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

    // Check if branch has active lessons or coaches
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            coaches: true,
            lessons: true,
          },
        },
      },
    })

    if (!branch) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "지점을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (branch._count.coaches > 0 || branch._count.lessons > 0) {
      return NextResponse.json(
        { error: { code: "HAS_DEPENDENCIES", message: "코치나 레슨이 등록된 지점은 삭제할 수 없습니다." } },
        { status: 400 }
      )
    }

    await prisma.branch.delete({
      where: { id },
    })

    return NextResponse.json({
      message: "지점이 삭제되었습니다.",
    })
  } catch (error) {
    console.error("Error deleting branch:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "지점 삭제 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
