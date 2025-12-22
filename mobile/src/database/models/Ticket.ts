import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text, relation, immutableRelation } from '@nozbe/watermelondb/decorators'
import { Event } from './Event'

export class Ticket extends Model {
    static table = 'tickets'
    static associations = {
        events: { type: 'belongs_to', key: 'event_id' },
    }

    @text('server_id') serverId!: string
    @text('event_id') eventId!: string
    @text('ticket_code') ticketCode!: string
    @text('attendee_name') attendeeName!: string
    @text('attendee_email') attendeeEmail!: string
    @text('status') status!: string
    @text('payment_status') paymentStatus!: string
    @text('checked_in_at') checkedInAt!: string
    @readonly @date('created_at') createdAt!: Date
    @date('synced_at') syncedAt!: Date

    @immutableRelation('events', 'event_id') event!: Event
}
