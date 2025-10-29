import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const weekdayRuleSchema = z.object({
  weekday: z.number().min(0).max(6),
  startTime: z.string(), // "HH:mm" format
  endTime: z.string(),
})

const timeOffSchema = z.object({
  startAt: z.string(), // ISO datetime
  endAt: z.string(),
  reason: z.string().optional(),
})

const updateScheduleSchema = z.object({
  availRules: z.array(weekdayRuleSchema).optional(),
  timeOffs: z.array(timeOffSchema).optional(),
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
        availRules: {
          orderBy: { weekday: "asc" },
        },
        timeOffs: {
          where: {
            endAt: {
              gte: new Date(),
            },
          },
          orderBy: { startAt: "asc" },
        },
      },
    })

    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "코치를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      availRules: coach.availRules,
      timeOffs: coach.timeOffs,
    })
  } catch (error) {
    console.error("Error fetching coach schedule:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "스케줄 정보를 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const validated = updateScheduleSchema.parse(body)

    // Check if coach exists
    const coach = await prisma.coach.findUnique({ where: { id } })
    if (!coach) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "코치를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Update availability rules if provided
    if (validated.availRules) {
      // Delete existing rules and create new ones
      await prisma.coachAvailRule.deleteMany({
        where: { coachId: id },
      })

      await prisma.coachAvailRule.createMany({
        data: validated.availRules.map((rule) => ({
          coachId: id,
          weekday: rule.weekday,
          startTime: new Date(`1970-01-01T${rule.startTime}:00Z`),
          endTime: new Date(`1970-01-01T${rule.endTime}:00Z`),
        })),
      })
    }

    // Add time-off periods if provided
    if (validated.timeOffs) {
      await prisma.coachTimeOff.createMany({
        data: validated.timeOffs.map((timeOff) => ({
          coachId: id,
          startAt: new Date(timeOff.startAt),
          endAt: new Date(timeOff.endAt),
          reason: timeOff.reason,
        })),
      })
    }

    const updatedSchedule = await prisma.coach.findUnique({
      where: { id },
      include: {
        availRules: {
          orderBy: { weekday: "asc" },
        },
        timeOffs: {
          where: {
            endAt: {
              gte: new Date(),
            },
          },
          orderBy: { startAt: "asc" },
        },
      },
    })

    return NextResponse.json({
      message: "스케줄이 업데이트되었습니다.",
      schedule: {
        availRules: updatedSchedule?.availRules || [],
        timeOffs: updatedSchedule?.timeOffs || [],
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
        { status: 400 }
      )
    }

    console.error("Error updating coach schedule:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "스케줄 업데이트 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
