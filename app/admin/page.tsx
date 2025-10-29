"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, MapPin, UserCheck, TrendingUp, Clock, DollarSign, Activity, BookOpen, Settings } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { ko } from "date-fns/locale"

interface DashboardStats {
  totalUsers: number
  totalCoaches: number
  totalBranches: number
  totalLessons: number
  todayReservations: number
  weekReservations: number
  monthReservations: number
  totalRevenue: number
}

export default function AdminDashboard() {
  const router = useRouter()

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  })

  const statCards = [
    {
      title: "전체 회원",
      value: stats?.totalUsers || 0,
      description: "등록된 회원 수",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "활성 코치",
      value: stats?.totalCoaches || 0,
      description: "등록된 코치 수",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "운영 지점",
      value: stats?.totalBranches || 0,
      description: "운영 중인 지점",
      icon: MapPin,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "오늘 예약",
      value: stats?.todayReservations || 0,
      description: "오늘 예정된 레슨",
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">
          {format(today, 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>예약 현황</CardTitle>
            <CardDescription>
              기간별 예약 통계
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">오늘</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.todayReservations || 0}</p>
                  <p className="text-xs text-muted-foreground">예약</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">이번 주</span>
                  <span className="text-xs text-muted-foreground">
                    ({format(weekStart, 'MM.dd')} - {format(weekEnd, 'MM.dd')})
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.weekReservations || 0}</p>
                  <p className="text-xs text-muted-foreground">예약</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">이번 달</span>
                  <span className="text-xs text-muted-foreground">
                    ({format(monthStart, 'MM월')})
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{stats?.monthReservations || 0}</p>
                  <p className="text-xs text-muted-foreground">예약</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>레슨 통계</CardTitle>
            <CardDescription>
              전체 레슨 정보
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">총 레슨 수</span>
                <span className="text-2xl font-bold">{stats?.totalLessons || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">평균 예약률</span>
                <span className="text-lg font-semibold">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">인기 시간대</span>
                <span className="text-lg font-semibold">19:00-21:00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Menu */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>관리 메뉴</CardTitle>
          <CardDescription>
            각 항목을 클릭하여 관리 페이지로 이동하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <button
              onClick={() => router.push('/admin/reservations')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">예약 관리</span>
            </button>
            <button
              onClick={() => router.push('/admin/users')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">회원 관리</span>
            </button>
            <button
              onClick={() => router.push('/admin/coaches')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <UserCheck className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">코치 관리</span>
            </button>
            <button
              onClick={() => router.push('/admin/lessons')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">레슨 관리</span>
            </button>
            <button
              onClick={() => router.push('/admin/branches')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">지점 관리</span>
            </button>
            <button
              onClick={() => router.push('/admin/schedules')}
              className="p-4 text-center border rounded-lg hover:bg-secondary transition-colors"
            >
              <Settings className="h-6 w-6 mx-auto mb-2 text-primary" />
              <span className="text-sm">스케줄 관리</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}