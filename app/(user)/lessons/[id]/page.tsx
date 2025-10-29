"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, parseISO, addMinutes, differenceInMinutes } from "date-fns"
import { ko } from "date-fns/locale"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, MapPin, User, ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"

interface TimeRange {
  start: string
  end: string
}

interface Lesson {
  id: string
  name: string
  description: string
  category: string
  coach: {
    id: string
    name: string
    bio: string
    careerText: string
  }
  branch: {
    id: string
    name: string
    address: string
  }
}

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const [isDragging, setIsDragging] = useState(false)

  // Fetch lesson details
  const { data: lesson, isLoading: isLoadingLesson } = useQuery<Lesson>({
    queryKey: ['lesson', params.id],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch lesson')
      return res.json()
    },
  })

  // Fetch availability
  const { data: availability, isLoading: isLoadingAvailability } = useQuery({
    queryKey: ['availability', params.id, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/lessons/${params.id}/availability?date=${selectedDate}`)
      if (!res.ok) throw new Error('Failed to fetch availability')
      return res.json()
    },
    enabled: !!params.id && !!selectedDate,
  })

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: { lessonId: string; startAt: string; endAt: string }) => {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error?.message || '예약 중 오류가 발생했습니다')
      }
      return result
    },
    onSuccess: () => {
      toast({
        title: "예약 완료",
        description: "레슨 예약이 확정되었습니다.",
      })
      router.push('/me/reservations')
    },
    onError: (error: Error) => {
      toast({
        title: "예약 실패",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    setSelectedTimeRange({ start: null, end: null })
  }

  const handleTimeSelect = (start: Date, end: Date) => {
    setSelectedTimeRange({ start, end })
  }

  const handleBooking = () => {
    if (!selectedTimeRange.start || !selectedTimeRange.end || !lesson) return

    const duration = differenceInMinutes(selectedTimeRange.end, selectedTimeRange.start)

    if (duration < 30) {
      toast({
        title: "시간 선택 오류",
        description: "최소 30분 이상 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    if (duration % 30 !== 0) {
      toast({
        title: "시간 선택 오류",
        description: "30분 단위로 선택해주세요.",
        variant: "destructive",
      })
      return
    }

    bookingMutation.mutate({
      lessonId: lesson.id,
      startAt: selectedTimeRange.start.toISOString(),
      endAt: selectedTimeRange.end.toISOString(),
    })
  }

  if (isLoadingLesson) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="container mx-auto py-6 px-4">
        <p className="text-center text-muted-foreground">레슨을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <Link href="/lessons" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="h-4 w-4 mr-1" />
        레슨 목록으로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lesson Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {lesson.category}
                </span>
              </div>
              <CardTitle className="text-2xl">{lesson.name}</CardTitle>
              <CardDescription className="text-base mt-2">
                {lesson.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{lesson.branch.name}</p>
                  <p className="text-sm text-muted-foreground">{lesson.branch.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                코치 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{lesson.coach.name} 코치</p>
                <p className="text-muted-foreground mt-2">{lesson.coach.bio}</p>
              </div>
              {lesson.coach.careerText && (
                <div>
                  <p className="font-medium mb-2">경력사항</p>
                  <div className="text-sm text-muted-foreground whitespace-pre-line pl-4 border-l-2 border-border">
                    {lesson.coach.careerText}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Booking */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>예약하기</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="date">날짜 선택</Label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <Label>가능한 시간대</Label>
                {isLoadingAvailability ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : availability?.availableRanges?.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {availability.availableRanges.map((range: TimeRange, index: number) => (
                      <TimeRangeSelector
                        key={index}
                        range={range}
                        onSelect={handleTimeSelect}
                        selected={selectedTimeRange}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    선택한 날짜에 가능한 시간이 없습니다.
                  </p>
                )}
              </div>

              {selectedTimeRange.start && selectedTimeRange.end && (
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">선택한 시간</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(selectedTimeRange.start, 'HH:mm')} - {format(selectedTimeRange.end, 'HH:mm')}
                      ({differenceInMinutes(selectedTimeRange.end, selectedTimeRange.start)}분)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(parseISO(selectedDate), 'yyyy년 MM월 dd일 (EEE)', { locale: ko })}
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleBooking}
                disabled={!selectedTimeRange.start || !selectedTimeRange.end || bookingMutation.isPending}
              >
                {bookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                예약하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Time Range Selector Component
function TimeRangeSelector({
  range,
  onSelect,
  selected
}: {
  range: TimeRange
  onSelect: (start: Date, end: Date) => void
  selected: { start: Date | null; end: Date | null }
}) {
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  const slots = []

  // Generate 30-minute slots
  let current = start
  while (current < end) {
    slots.push(new Date(current))
    current = addMinutes(current, 30)
  }

  const handleSlotClick = (slotStart: Date) => {
    const slotEnd = addMinutes(slotStart, 30)
    onSelect(slotStart, slotEnd)
  }

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">
        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
      </div>
      <div className="flex flex-wrap gap-1">
        {slots.map((slot, i) => {
          const slotEnd = addMinutes(slot, 30)
          const isSelected = selected.start?.getTime() === slot.getTime() &&
                           selected.end?.getTime() === slotEnd.getTime()

          return (
            <button
              key={i}
              onClick={() => handleSlotClick(slot)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {format(slot, 'HH:mm')}
            </button>
          )
        })}
      </div>
    </div>
  )
}