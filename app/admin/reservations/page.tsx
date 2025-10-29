"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, User, Search, Filter, Loader2 } from "lucide-react"

interface Reservation {
  id: string
  startAt: string
  endAt: string
  status: string
  goal: string | null
  categoryTag: string | null
  lesson: {
    name: string
    category: string
  }
  user: {
    profile: {
      name: string
      gender: string
      birthdate: string | null
      phone: string | null
    }
  }
  coach: {
    name: string
    phone: string | null
  }
  branch: {
    name: string
    address: string
  }
  feedback?: {
    content: string
  }
}

const statusOptions = [
  { value: "PENDING", label: "예약 대기", color: "bg-yellow-500" },
  { value: "CONFIRMED", label: "예약 완료", color: "bg-blue-500" },
  { value: "ATTENDED", label: "출석", color: "bg-green-500" },
  { value: "NO_SHOW", label: "결석", color: "bg-red-500" },
  { value: "CANCELED", label: "취소", color: "bg-gray-500" },
  { value: "HOLIDAY", label: "휴일", color: "bg-purple-500" },
]

export default function AdminReservationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [feedbackContent, setFeedbackContent] = useState("")

  // Fetch reservations
  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['admin-reservations', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      const res = await fetch(`/api/admin/reservations?${params}`)
      if (!res.ok) throw new Error('Failed to fetch reservations')
      return res.json()
    },
  })

  // Update reservation status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "상태 변경 완료",
        description: "예약 상태가 변경되었습니다.",
      })
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] })
    },
    onError: () => {
      toast({
        title: "변경 실패",
        description: "상태 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    },
  })

  // Add feedback
  const addFeedbackMutation = useMutation({
    mutationFn: async ({ reservationId, content }: { reservationId: string; content: string }) => {
      const res = await fetch(`/api/admin/reservations/${reservationId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Failed to add feedback')
      return res.json()
    },
    onSuccess: () => {
      toast({
        title: "피드백 등록 완료",
        description: "코치 피드백이 등록되었습니다.",
      })
      queryClient.invalidateQueries({ queryKey: ['admin-reservations'] })
      setSelectedReservation(null)
      setFeedbackContent("")
    },
    onError: () => {
      toast({
        title: "등록 실패",
        description: "피드백 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    },
  })

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status })
  }

  const handleFeedbackSubmit = () => {
    if (!selectedReservation || !feedbackContent.trim()) return
    addFeedbackMutation.mutate({
      reservationId: selectedReservation.id,
      content: feedbackContent,
    })
  }

  // Filter reservations based on search
  const filteredReservations = reservations.filter((reservation) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      reservation.user.profile.name.toLowerCase().includes(searchLower) ||
      reservation.lesson.name.toLowerCase().includes(searchLower) ||
      reservation.coach.name.toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">예약 관리</h1>
        <p className="text-muted-foreground">전체 예약 내역을 관리합니다.</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="회원명, 레슨명, 코치명으로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜/시간</TableHead>
                  <TableHead>레슨</TableHead>
                  <TableHead>회원</TableHead>
                  <TableHead>코치</TableHead>
                  <TableHead>지점</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      예약 내역이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(reservation.startAt), 'MM/dd (EEE)', { locale: ko })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(reservation.startAt), 'HH:mm')} -
                            {format(new Date(reservation.endAt), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.lesson.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.lesson.category}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.user.profile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reservation.user.profile.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{reservation.coach.name}</TableCell>
                      <TableCell>{reservation.branch.name}</TableCell>
                      <TableCell>
                        <Select
                          value={reservation.status}
                          onValueChange={(value) => handleStatusChange(reservation.id, value)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${option.color}`} />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>예약 상세 정보</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>레슨</Label>
                  <p className="font-medium">{selectedReservation.lesson.name}</p>
                </div>
                <div>
                  <Label>카테고리</Label>
                  <p className="font-medium">{selectedReservation.lesson.category}</p>
                </div>
                <div>
                  <Label>날짜/시간</Label>
                  <p className="font-medium">
                    {format(new Date(selectedReservation.startAt), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                  </p>
                </div>
                <div>
                  <Label>지점</Label>
                  <p className="font-medium">{selectedReservation.branch.name}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">회원 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>이름</Label>
                    <p>{selectedReservation.user.profile.name}</p>
                  </div>
                  <div>
                    <Label>연락처</Label>
                    <p>{selectedReservation.user.profile.phone || '-'}</p>
                  </div>
                  <div>
                    <Label>성별</Label>
                    <p>{selectedReservation.user.profile.gender}</p>
                  </div>
                  {selectedReservation.goal && (
                    <div>
                      <Label>레슨 목표</Label>
                      <p>{selectedReservation.goal}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedReservation.status === 'ATTENDED' && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">코치 피드백</h3>
                  {selectedReservation.feedback ? (
                    <p className="text-sm">{selectedReservation.feedback.content}</p>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="피드백을 입력하세요"
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                        rows={4}
                      />
                      <Button
                        onClick={handleFeedbackSubmit}
                        disabled={!feedbackContent.trim() || addFeedbackMutation.isPending}
                      >
                        {addFeedbackMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        피드백 등록
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}