"use client"

import { useQuery } from "@tanstack/react-query"
import { format, differenceInDays } from "date-fns"
import { ko } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatMinutesToTime } from "@/lib/utils"
import { Clock, Calendar, AlertCircle, Loader2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface Membership {
  id: string
  remainingMinutes: number
  expiresAt: string
  active: boolean
  coach: {
    id: string
    name: string
    phone: string | null
  }
  _count?: {
    ledgerEntries: number
  }
}

interface LedgerEntry {
  id: string
  deltaMinutes: number
  reason: string
  createdAt: string
  reservation?: {
    id: string
    lesson: {
      name: string
    }
  }
}

const reasonLabels: Record<string, string> = {
  ALLOCATE: "회원권 발급",
  BOOKING: "레슨 예약",
  CANCEL_REFUND: "예약 취소 환불",
  ADJUST: "관리자 조정",
}

const reasonColors: Record<string, string> = {
  ALLOCATE: "bg-green-500",
  BOOKING: "bg-blue-500",
  CANCEL_REFUND: "bg-yellow-500",
  ADJUST: "bg-purple-500",
}

export default function MyMembershipsPage() {
  const [selectedMembership, setSelectedMembership] = useState<string | null>(null)

  // Fetch memberships
  const { data: memberships = [], isLoading } = useQuery<Membership[]>({
    queryKey: ['my-memberships'],
    queryFn: async () => {
      const res = await fetch('/api/me/memberships')
      if (!res.ok) throw new Error('Failed to fetch memberships')
      return res.json()
    },
  })

  // Fetch ledger for selected membership
  const { data: ledgerEntries = [], isLoading: isLoadingLedger } = useQuery<LedgerEntry[]>({
    queryKey: ['membership-ledger', selectedMembership],
    queryFn: async () => {
      const res = await fetch(`/api/memberships/${selectedMembership}/ledger`)
      if (!res.ok) throw new Error('Failed to fetch ledger')
      return res.json()
    },
    enabled: !!selectedMembership,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const activeMemberships = memberships.filter(m => m.active)
  const expiredMemberships = memberships.filter(m => !m.active)

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">나의 회원권</h1>
      <p className="text-muted-foreground mb-6">보유한 회원권과 사용 내역을 확인하세요</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Memberships List */}
        <div className="space-y-6">
          {activeMemberships.length === 0 && expiredMemberships.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">보유한 회원권이 없습니다.</p>
                <Link href="/lessons">
                  <Button>레슨 둘러보기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Active Memberships */}
              {activeMemberships.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">사용 가능한 회원권</h2>
                  <div className="space-y-3">
                    {activeMemberships.map((membership) => (
                      <MembershipCard
                        key={membership.id}
                        membership={membership}
                        isSelected={selectedMembership === membership.id}
                        onSelect={() => setSelectedMembership(
                          selectedMembership === membership.id ? null : membership.id
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Memberships */}
              {expiredMemberships.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 text-muted-foreground">만료된 회원권</h2>
                  <div className="space-y-3 opacity-60">
                    {expiredMemberships.map((membership) => (
                      <MembershipCard
                        key={membership.id}
                        membership={membership}
                        isSelected={selectedMembership === membership.id}
                        onSelect={() => setSelectedMembership(
                          selectedMembership === membership.id ? null : membership.id
                        )}
                        isExpired
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Ledger */}
        {selectedMembership && (
          <div>
            <h2 className="text-lg font-semibold mb-3">사용 내역</h2>
            {isLoadingLedger ? (
              <Card>
                <CardContent className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
              </Card>
            ) : ledgerEntries.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">사용 내역이 없습니다.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">상세 내역</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ledgerEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between py-3 border-b last:border-0"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className={`${reasonColors[entry.reason]} text-white text-xs`}
                            >
                              {reasonLabels[entry.reason]}
                            </Badge>
                            {entry.reservation && (
                              <span className="text-sm">
                                {entry.reservation.lesson.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            entry.deltaMinutes > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.deltaMinutes > 0 ? '+' : ''}{entry.deltaMinutes}분
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MembershipCard({
  membership,
  isSelected,
  onSelect,
  isExpired = false,
}: {
  membership: Membership
  isSelected: boolean
  onSelect: () => void
  isExpired?: boolean
}) {
  const expiresAt = new Date(membership.expiresAt)
  const daysRemaining = differenceInDays(expiresAt, new Date())
  const isNearExpiry = daysRemaining <= 7 && daysRemaining > 0

  // Calculate usage percentage (assuming 600 minutes initial)
  const usagePercentage = Math.max(0, Math.min(100, (membership.remainingMinutes / 600) * 100))

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${isExpired ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{membership.coach.name} 코치</CardTitle>
            <CardDescription>
              {membership.coach.phone && `연락처: ${membership.coach.phone}`}
            </CardDescription>
          </div>
          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
            isSelected ? 'rotate-90' : ''
          }`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isExpired && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">남은 시간</span>
              </div>
              <span className="font-semibold">{formatMinutesToTime(membership.remainingMinutes)}</span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
          </>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">만료일</span>
          </div>
          <div className="text-right">
            <p className="font-medium">
              {format(expiresAt, 'yyyy.MM.dd', { locale: ko })}
            </p>
            {!isExpired && (
              <p className={`text-xs ${
                isNearExpiry ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {daysRemaining > 0 ? `D-${daysRemaining}` : '오늘 만료'}
              </p>
            )}
          </div>
        </div>

        {isExpired && (
          <Badge variant="destructive" className="w-full justify-center">
            만료됨
          </Badge>
        )}
        {!isExpired && isNearExpiry && (
          <Badge variant="outline" className="w-full justify-center text-destructive">
            만료 임박
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}