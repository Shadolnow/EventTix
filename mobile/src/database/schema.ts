import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'events',
            columns: [
                { name: 'server_id', type: 'string', isIndexed: true },
                { name: 'title', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'date', type: 'string' },
                { name: 'location', type: 'string', isOptional: true },
                { name: 'image_url', type: 'string', isOptional: true },
                { name: 'capacity', type: 'number', isOptional: true },
                { name: 'price', type: 'number', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
                { name: 'synced_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'tickets',
            columns: [
                { name: 'server_id', type: 'string', isIndexed: true },
                { name: 'event_id', type: 'string', isIndexed: true },
                { name: 'ticket_code', type: 'string', isIndexed: true },
                { name: 'attendee_name', type: 'string' },
                { name: 'attendee_email', type: 'string' },
                { name: 'status', type: 'string' }, // 'valid', 'checked_in', 'cancelled'
                { name: 'payment_status', type: 'string' },
                { name: 'checked_in_at', type: 'string', isOptional: true },
                { name: 'created_at', type: 'number' },
                { name: 'synced_at', type: 'number' },
            ]
        }),
        tableSchema({
            name: 'sync_queue',
            columns: [
                { name: 'operation', type: 'string' }, // 'create', 'update', 'delete'
                { name: 'table_name', type: 'string' },
                { name: 'record_id', type: 'string' },
                { name: 'data', type: 'string' }, // JSON stringified
                { name: 'created_at', type: 'number' },
            ]
        }),
    ]
})
