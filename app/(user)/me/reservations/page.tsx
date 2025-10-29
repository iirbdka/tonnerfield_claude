"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, isPast, isFuture } from "date-fns"
import { ko } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, User, Loader2 } from "lucide-react"
import Link from "next/link"

interface Reservation {
  id: string
  startAt: string
  endAt: string
  status: string
  lesson: {
    id: string
    name: string
    category: string
    coach: {
      name: string
    }
    branch: {
      name: string
      address: string
    }
  }
  feedback?: {
    content: string
  }
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  ATTENDED: "bg-green-500",
  NO_SHOW: "bg-red-500",
  CANCELED: "bg-gray-500",
}

const statusLabels: Record<string, string> = {
  PENDING: "예약 대기",
  CONFIRMED: "예약 완료",
  ATTENDED: "출석",
  NO_SHOW: "결석",
  CANCELED: "취소됨",
}

export default function MyReservationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTab, setSelectedTab] = useState("upcoming")
  const [cancelReservationId, setCancelReservationId] = useState<string | null>(null)

  // Fetch reservations
  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => {
      const res = await fetch('/api/reservations')
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json()
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: 'PATCH',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || '취소 중 오류가 발생했습니다')
      }
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "예약 취소 완료",
        description: "예약이 취소되고 회원권 시간이 복원되었습니다.",
      })
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] })
    },
    onError: (error: Error) => {
      toast({
        title: "취소 실패",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id)
    setCancelReservationId(null)
  }

  // Filter reservations
  const upcomingReservations = reservations.filter(
    (r) => isFuture(new Date(r.startAt)) && !['CANCELED', 'NO_SHOW'].includes(r.status)
  )

  const pastReservations = reservations.filter(
    (r) => isPast(new Date(r.startAt)) || ['ATTENDED', 'NO_SHOW'].includes(r.status)
  )

  const canceledReservations = reservations.filter((r) => r.status === 'CANCELED')

  const getFilteredReservations = () => {
    switch (selectedTab) {
      case 'upcoming':
        return upcomingReservations
      case 'past':
        return pastReservations
      case 'canceled':
        return canceledReservations
      default:
        return reservations
    }
  }

  const filteredReservations = getFilteredReservations()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">나의 레슨</h1>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            전체 ({reservations.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            예정 ({upcomingReservations.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            완료 ({pastReservations.length})
          </TabsTrigger>
          <TabsTrigger value="canceled">
            취소 ({canceledReservations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          {filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">예약된 레슨이 없습니다.</p>
                <Link href="/lessons">
                  <Button>레슨 둘러보기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => (
                <ReservationCard
                  key={reservation.id}
                  reservation={reservation}
                  onCancel={() => setCancelReservationId(reservation.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!cancelReservationId}
        onOpenChange={() => setCancelReservationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예약을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              예약을 취소하면 회원권 시간이 다시 복원됩니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니요</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelReservationId && handleCancel(cancelReservationId)}
            >
              예, 취소합니다
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation
  onCancel: () => void
}) {
  const startDate = new Date(reservation.startAt)
  const endDate = new Date(reservation.endAt)
  const isPastReservation = isPast(startDate)
  const canCancel = ['PENDING', 'CONFIRMED'].includes(reservation.status) && !isPastReservation

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{reservation.lesson.name}</CardTitle>
            <CardDescription className="mt-1">
              {reservation.lesson.coach.name} 코치 · {reservation.lesson.branch.name}
            </CardDescription>
          </div>
          <Badge className={`${statusColors[reservation.status]} text-white`}>
            {statusLabels[reservation.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{reservation.lesson.branch.address}</span>
          </div>
        </div>

        {reservation.feedback && (
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm font-medium mb-2">코치 피드백</p>
            <p className="text-sm text-muted-foreground">{reservation.feedback.content}</p>
          </div>
        )}

        {canCancel && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              예약 취소
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}