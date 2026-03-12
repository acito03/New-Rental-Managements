'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  color: string
}

interface Props {
  events: CalendarEvent[]
}

export function DashboardCalendar({ events }: Props) {
  // Adjust end dates for inclusive display in FullCalendar (add 1 day)
  const adjustedEvents = useMemo(() =>
    events.map(e => ({
      ...e,
      end: e.end ? new Date(new Date(e.end).getTime() + 86400000).toISOString().split('T')[0] : e.end,
    })),
    [events]
  )

  return (
    <div className="fc-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={adjustedEvents}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek',
        }}
        height={480}
        eventDisplay="block"
        eventTimeFormat={{ hour: undefined, minute: undefined }}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} more`}
        eventClassNames="text-xs font-medium"
      />
    </div>
  )
}
