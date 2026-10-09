export async function countActiveRegistrations(prismaClient, workshopId) {
  return prismaClient.registration.count({
    where: { workshopId, status: 'ACTIVE' },
  })
}

export function workshopAvailability(workshop, activeCount) {
  const remainingSeats = Math.max(0, workshop.capacity - activeCount)
  return {
    capacity: workshop.capacity,
    activeRegistrationCount: activeCount,
    remainingSeats,
    isAvailable: remainingSeats > 0 && workshop.status === 'SCHEDULED',
  }
}

export async function withWorkshopAvailability(prismaClient, workshop) {
  const activeCount = await countActiveRegistrations(prismaClient, workshop.id)
  return {
    ...workshop,
    ...workshopAvailability(workshop, activeCount),
  }
}
