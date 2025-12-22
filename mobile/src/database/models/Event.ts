import { Model } from '@nozbe/watermelondb'
import { field, date, readonly, text, relation } from '@nozbe/watermelondb/decorators'

export class Event extends Model {
    static table = 'events'

    @text('server_id') serverId!: string
    @text('title') title!: string
    @text('description') description!: string
    @text('date') date!: string
    @text('location') location!: string
    @text('image_url') imageUrl!: string
    @field('capacity') capacity!: number
    @field('price') price!: number
    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
    @date('synced_at') syncedAt!: Date
}
