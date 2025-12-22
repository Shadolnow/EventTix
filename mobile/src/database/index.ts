import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import { Event } from './models/Event'
import { Ticket } from './models/Ticket'

const adapter = new SQLiteAdapter({
    schema,
    jsi: true, // JSI for maximum performance on iOS
    onSetUpError: (error) => {
        console.error('Database setup error:', error)
    }
})

export const database = new Database({
    adapter,
    modelClasses: [Event, Ticket],
})
