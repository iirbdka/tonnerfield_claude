import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const by = searchParams.get("by") || "lesson"
    const query = searchParams.get("q") || ""
    const cursor = searchParams.get("cursor")
    const limit = 20

    let where: any = {}

    if (query) {
      switch (by) {
        case "coach":
          where.coach = {
            name: {
              contains: query,
              mode: "insensitive"
            }
          }
          break
        case "branch":
          where.branch = {
            name: {
              contains: query,
              mode: "insensitive"
            }
          }
          break
        default:
          where.name = {
            contains: query,
            mode: "insensitive"
          }
      }
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        coach: true,
        branch: true,
      },
      take: limit + 1,
      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),
      orderBy: {
        createdAt: "desc",
      },
    })

    const hasMore = lessons.length > limit
    const items = hasMore ? lessons.slice(0, -1) : lessons
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error("Error fetching lessons:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "레슨 목록을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}