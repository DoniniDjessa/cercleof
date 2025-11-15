"use client"

import { AddAppointment } from "@/components/appointments/add-appointment"
import { useRouter } from "next/navigation"

export default function CreateAppointmentPage() {
  const router = useRouter()

  return (
    <AddAppointment 
      onAppointmentCreated={() => {
        router.push('/admin/appointments')
      }} 
    />
  )
}

