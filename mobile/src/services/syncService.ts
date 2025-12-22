import { supabase } from './supabase'
import { database } from '../database'
import { Event } from '../database/models/Event'
import { Ticket } from '../database/models/Ticket'

export class SyncService {
    static async syncEvents() {
        try {
            // Fetch events from Supabase
            const { data: remoteEvents, error } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Update local database
            await database.write(async () => {
                for (const remoteEvent of remoteEvents || []) {
                    const existingEvent = await database.collections
                        .get<Event>('events')
                        .query()
                        .where('server_id', remoteEvent.id)
                        .fetch()

                    if (existingEvent.length > 0) {
                        // Update existing
                        await existingEvent[0].update((event: any) => {
                            event.title = remoteEvent.title
                            event.description = remoteEvent.description
                            event.date = remoteEvent.event_date
                            event.location = remoteEvent.venue
                            event.imageUrl = remoteEvent.image_url
                            event.capacity = remoteEvent.capacity
                            event.price = remoteEvent.price
                            event.syncedAt = new Date()
                        })
                    } else {
                        // Create new
                        await database.collections.get<Event>('events').create((event: any) => {
                            event.serverId = remoteEvent.id
                            event.title = remoteEvent.title
                            event.description = remoteEvent.description
                            event.date = remoteEvent.event_date
                            event.location = remoteEvent.venue
                            event.imageUrl = remoteEvent.image_url
                            event.capacity = remoteEvent.capacity
                            event.price = remoteEvent.price
                            event.syncedAt = new Date()
                        })
                    }
                }
            })

            return { success: true, count: remoteEvents?.length || 0 }
        } catch (error) {
            console.error('Sync error:', error)
            return { success: false, error }
        }
    }

    static async syncTickets(userId: string) {
        try {
            const { data: remoteTickets, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('attendee_email', userId) // Assuming userId is email
                .order('created_at', { ascending: false })

            if (error) throw error

            await database.write(async () => {
                for (const remoteTicket of remoteTickets || []) {
                    const existingTicket = await database.collections
                        .get<Ticket>('tickets')
                        .query()
                        .where('server_id', remoteTicket.id)
                        .fetch()

                    if (existingTicket.length === 0) {
                        await database.collections.get<Ticket>('tickets').create((ticket: any) => {
                            ticket.serverId = remoteTicket.id
                            ticket.eventId = remoteTicket.event_id
                            ticket.ticketCode = remoteTicket.ticket_code
                            ticket.attendeeName = remoteTicket.attendee_name
                            ticket.attendeeEmail = remoteTicket.attendee_email
                            ticket.status = remoteTicket.payment_status === 'paid' ? 'valid' : 'pending'
                            ticket.paymentStatus = remoteTicket.payment_status
                            ticket.checkedInAt = remoteTicket.checked_in_at || ''
                            ticket.syncedAt = new Date()
                        })
                    }
                }
            })

            return { success: true, count: remoteTickets?.length || 0 }
        } catch (error) {
            console.error('Ticket sync error:', error)
            return { success: false, error }
        }
    }

    static async checkInTicket(ticketCode: string) {
        try {
            // Update in Supabase
            const { error } = await supabase
                .from('tickets')
                .update({ checked_in_at: new Date().toISOString() })
                .eq('ticket_code', ticketCode)

            if (error) throw error

            // Update local database
            const localTickets = await database.collections
                .get<Ticket>('tickets')
                .query()
                .where('ticket_code', ticketCode)
                .fetch()

            if (localTickets.length > 0) {
                await database.write(async () => {
                    await localTickets[0].update((ticket: any) => {
                        ticket.checkedInAt = new Date().toISOString()
                        ticket.status = 'checked_in'
                    })
                })
            }

            return { success: true }
        } catch (error) {
            console.error('Check-in error:', error)
            return { success: false, error }
        }
    }
}
