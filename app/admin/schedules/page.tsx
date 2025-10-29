"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"

interface Coach {
  id: string
  name: string
}

interface AvailRule {
  id: string
  weekday: number
  startTime: string
  endTime: string
}

interface TimeOff {
  id: string
  startAt: string
  endAt: string
  reason: string | null
}

interface Schedule {
  availRules: AvailRule[]
  timeOffs: TimeOff[]
}

export default function SchedulesPage() {
  const [selectedCoachId, setSelectedCoachId] = useState<string>("")
  const [isEditRulesOpen, setIsEditRulesOpen] = useState(false)
  const [isAddTimeOffOpen, setIsAddTimeOffOpen] = useState(false)
  const [weekRules, setWeekRules] = useState<Record<number, { startTime: string; endTime: string }>>({})
  const [timeOffForm, setTimeOffForm] = useState({
    startAt: "",
    endAt: "",
    reason: "",
  })

  const queryClient = useQueryClient()

  const { data: coaches } = useQuery<Coach[]>({
    queryKey: ["admin", "coaches"],
    queryFn: async () => {
      const res = await fetch("/api/admin/coaches")
      if (!res.ok) throw new Error("Failed to fetch coaches")
      return res.json()
    },
  })

  const { data: schedule, isLoading: isLoadingSchedule } = useQuery<Schedule>({
    queryKey: ["admin", "coach-schedule", selectedCoachId],
    queryFn: async () => {
      if (!selectedCoachId) return { availRules: [], timeOffs: [] }
      const res = await fetch(`/api/admin/coaches/${selectedCoachId}/schedule`)
      if (!res.ok) throw new Error("Failed to fetch schedule")
      return res.json()
    },
    enabled: !!selectedCoachId,
  })

  const updateScheduleMutation = useMutation({
    mutationFn: async (data: { availRules?: any[]; timeOffs?: any[] }) => {
      const res = await fetch(`/api/admin/coaches/${selectedCoachId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to update schedule")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coach-schedule", selectedCoachId] })
      setIsEditRulesOpen(false)
      setIsAddTimeOffOpen(false)
      resetTimeOffForm()
      toast({
        title: "성공",
        description: "스케줄이 업데이트되었습니다.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "오류",
        description: error.message,
      })
    },
  })

  const deleteTimeOffMutation = useMutation({
    mutationFn: async (timeOffId: string) => {
      const res = await fetch(`/api/admin/coaches/${selectedCoachId}/timeoffs?timeOffId=${timeOffId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || "Failed to delete time-off")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coach-schedule", selectedCoachId] })
      toast({
        title: "성공",
        description: "휴무가 삭제되었습니다.",
      })
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "오류",
        description: error.message,
      })
    },
  })

  const resetTimeOffForm = () => {
    setTimeOffForm({
      startAt: "",
      endAt: "",
      reason: "",
    })
  }

  const handleEditRules = () => {
    // Initialize form with existing rules
    const rulesMap: Record<number, { startTime: string; endTime: string }> = {}
    schedule?.availRules.forEach((rule) => {
      const startTime = new Date(rule.startTime)
      const endTime = new Date(rule.endTime)
      rulesMap[rule.weekday] = {
        startTime: `${startTime.getUTCHours().toString().padStart(2, "0")}:${startTime.getUTCMinutes().toString().padStart(2, "0")}`,
        endTime: `${endTime.getUTCHours().toString().padStart(2, "0")}:${endTime.getUTCMinutes().toString().padStart(2, "0")}`,
      }
    })
    setWeekRules(rulesMap)
    setIsEditRulesOpen(true)
  }

  const handleSubmitRules = (e: React.FormEvent) => {
    e.preventDefault()
    const availRules = Object.entries(weekRules)
      .filter(([_, times]) => times.startTime && times.endTime)
      .map(([weekday, times]) => ({
        weekday: parseInt(weekday),
        startTime: times.startTime,
        endTime: times.endTime,
      }))

    updateScheduleMutation.mutate({ availRules })
  }

  const handleSubmitTimeOff = (e: React.FormEvent) => {
    e.preventDefault()
    updateScheduleMutation.mutate({
      timeOffs: [
        {
          startAt: new Date(timeOffForm.startAt).toISOString(),
          endAt: new Date(timeOffForm.endAt).toISOString(),
          reason: timeOffForm.reason || undefined,
        },
      ],
    })
  }

  const handleDeleteTimeOff = (timeOffId: string) => {
    if (confirm("이 휴무를 삭제하시겠습니까?")) {
      deleteTimeOffMutation.mutate(timeOffId)
    }
  }

  const toggleWeekday = (weekday: number) => {
    setWeekRules((prev) => {
      const newRules = { ...prev }
      if (newRules[weekday]) {
        delete newRules[weekday]
      } else {
        newRules[weekday] = { startTime: "09:00", endTime: "18:00" }
      }
      return newRules
    })
  }

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"]

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">스케줄 관리</h1>
        <p className="text-muted-foreground mt-1">코치의 가용 시간과 휴무를 관리합니다</p>
      </div>

      {/* Coach Selection */}
      <Card>
        <CardHeader>
          <CardTitle>코치 선택</CardTitle>
          <CardDescription>스케줄을 관리할 코치를 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="코치를 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {coaches?.map((coach) => (
                <SelectItem key={coach.id} value={coach.id}>
                  {coach.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCoachId && !isLoadingSchedule && (
        <>
          {/* Weekly Availability Rules */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>주간 가용 시간</CardTitle>
                  <CardDescription>요일별 레슨 가능 시간대</CardDescription>
                </div>
                <Button onClick={handleEditRules}>
                  <Clock className="w-4 h-4 mr-2" />
                  시간 설정
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schedule?.availRules && schedule.availRules.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedule.availRules.map((rule) => {
                    const startTime = new Date(rule.startTime)
                    const endTime = new Date(rule.endTime)
                    return (
                      <div
                        key={rule.id}
                        className="p-4 border rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold">{weekdayNames[rule.weekday]}요일</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {startTime.getUTCHours().toString().padStart(2, "0")}:
                            {startTime.getUTCMinutes().toString().padStart(2, "0")} -{" "}
                            {endTime.getUTCHours().toString().padStart(2, "0")}:
                            {endTime.getUTCMinutes().toString().padStart(2, "0")}
                          </div>
                        </div>
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          활성
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>설정된 가용 시간이 없습니다</p>
                  <Button variant="link" onClick={handleEditRules} className="mt-2">
                    시간 설정하기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Off Periods */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>휴무 일정</CardTitle>
                  <CardDescription>예정된 휴무 기간</CardDescription>
                </div>
                <Button onClick={() => setIsAddTimeOffOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  휴무 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schedule?.timeOffs && schedule.timeOffs.length > 0 ? (
                <div className="space-y-3">
                  {schedule.timeOffs.map((timeOff) => (
                    <div
                      key={timeOff.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {format(new Date(timeOff.startAt), "yyyy-MM-dd HH:mm")} ~{" "}
                            {format(new Date(timeOff.endAt), "yyyy-MM-dd HH:mm")}
                          </div>
                          {timeOff.reason && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {timeOff.reason}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTimeOff(timeOff.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>예정된 휴무가 없습니다</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Rules Dialog */}
      <Dialog open={isEditRulesOpen} onOpenChange={setIsEditRulesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>주간 가용 시간 설정</DialogTitle>
            <DialogDescription>
              각 요일별로 레슨이 가능한 시간대를 설정하세요
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRules}>
            <div className="space-y-4">
              {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                <div key={weekday} className="flex items-center gap-4">
                  <div className="flex items-center space-x-2 w-20">
                    <input
                      type="checkbox"
                      id={`day-${weekday}`}
                      checked={!!weekRules[weekday]}
                      onChange={() => toggleWeekday(weekday)}
                      className="rounded"
                    />
                    <Label htmlFor={`day-${weekday}`} className="font-semibold">
                      {weekdayNames[weekday]}요일
                    </Label>
                  </div>
                  {weekRules[weekday] && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={weekRules[weekday].startTime}
                        onChange={(e) =>
                          setWeekRules({
                            ...weekRules,
                            [weekday]: {
                              ...weekRules[weekday],
                              startTime: e.target.value,
                            },
                          })
                        }
                        required
                      />
                      <span>~</span>
                      <Input
                        type="time"
                        value={weekRules[weekday].endTime}
                        onChange={(e) =>
                          setWeekRules({
                            ...weekRules,
                            [weekday]: {
                              ...weekRules[weekday],
                              endTime: e.target.value,
                            },
                          })
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditRulesOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={updateScheduleMutation.isPending}>
                {updateScheduleMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Time Off Dialog */}
      <Dialog open={isAddTimeOffOpen} onOpenChange={setIsAddTimeOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴무 추가</DialogTitle>
            <DialogDescription>휴무 기간을 추가합니다</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTimeOff}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="startAt">시작 일시 *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={timeOffForm.startAt}
                  onChange={(e) =>
                    setTimeOffForm({ ...timeOffForm, startAt: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="endAt">종료 일시 *</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={timeOffForm.endAt}
                  onChange={(e) =>
                    setTimeOffForm({ ...timeOffForm, endAt: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="reason">사유</Label>
                <Input
                  id="reason"
                  value={timeOffForm.reason}
                  onChange={(e) =>
                    setTimeOffForm({ ...timeOffForm, reason: e.target.value })
                  }
                  placeholder="예: 개인 사유, 연차"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddTimeOffOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={updateScheduleMutation.isPending}>
                {updateScheduleMutation.isPending ? "추가 중..." : "추가"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
