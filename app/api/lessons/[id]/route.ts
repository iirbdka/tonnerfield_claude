import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        coach: {
          include: {
            branches: {
              include: {
                branch: true
              }
            }
          }
        },
        branch: true,
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