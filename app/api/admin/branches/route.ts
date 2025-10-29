import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createBranchSchema = z.object({
  name: z.string().min(1, "지점명은 필수입니다"),
  address: z.string().min(1, "주소는 필수입니다"),
  phone: z.string().min(1, "전화번호는 필수입니다"),
  description: z.string().optional(),
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

    const branches = await prisma.branch.findMany({
      include: {
        _count: {
          select: {
            coaches: true,
            lessons: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(branches)
  } catch (error) {
    console.error("Error fetching branches:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "지점 목록을 불러오는 중 오류가 발생했습니다." } },
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
    const validated = createBranchSchema.parse(body)

    const branch = await prisma.branch.create({
      data: validated,
    })

    return NextResponse.json({
      message: "지점이 생성되었습니다.",
      branch,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error creating branch:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "지점 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
