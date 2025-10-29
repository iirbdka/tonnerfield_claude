import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify membership ownership
    const membership = await prisma.membership.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!membership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "회원권을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (membership.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "본인의 회원권만 조회할 수 있습니다." } },
        { status: 403 }
      )
    }

    const ledgerEntries = await prisma.membershipLedger.findMany({
      where: {
        membershipId: id,
      },
      include: {
        reservation: {
          select: {
            id: true,
            lesson: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(ledgerEntries)
  } catch (error) {
    console.error("Error fetching ledger:", error)
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: "사용 내역을 불러오는 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}