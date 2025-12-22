import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { database } from '../src/database'
import { Event } from '../src/database/models/Event'
import { SyncService } from '../src/services/syncService'
import { format } from 'date-fns'
import { LinearGradient } from 'expo-linear-gradient'

export default function EventsScreen() {
    const router = useRouter()
    const [events, setEvents] = useState<Event[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        loadEvents()
        syncFromServer()
    }, [])

    const loadEvents = async () => {
        try {
            const eventsCollection = database.collections.get<Event>('events')
            const allEvents = await eventsCollection.query().fetch()
            setEvents(allEvents)
        } catch (error) {
            console.error('Error loading events:', error)
        } finally {
            setLoading(false)
        }
    }

    const syncFromServer = async () => {
        const result = await SyncService.syncEvents()
        if (result.success) {
            loadEvents()
        }
    }

    const onRefresh = async () => {
        setRefreshing(true)
        await syncFromServer()
        setRefreshing(false)
    }

    const renderEvent = ({ item }: { item: Event }) => (
        <Pressable
            style={styles.eventCard}
            onPress={() => router.push(`/event/${item.serverId}`)}
        >
            <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/400x200' }}
                style={styles.eventImage}
                resizeMode="cover"
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
            />
            <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <View style={styles.metaRow}>
                    <Text style={styles.eventDate}>
                        📅 {format(new Date(item.date), 'MMM d, yyyy')}
                    </Text>
                    {item.price > 0 && (
                        <Text style={styles.eventPrice}>₹{item.price}</Text>
                    )}
                </View>
                {item.location && (
                    <Text style={styles.eventLocation} numberOfLines={1}>
                        📍 {item.location}
                    </Text>
                )}
            </View>
        </Pressable>
    )

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#00D9FF" />
                <Text style={styles.loadingText}>Loading events...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0A0F1C', '#1E293B']}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>Discover Events</Text>
                <Text style={styles.headerSubtitle}>
                    {events.length} event{events.length !== 1 ? 's' : ''} available
                </Text>
            </LinearGradient>

            <FlatList
                data={events}
                renderItem={renderEvent}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#00D9FF"
                        colors={['#00D9FF']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No events available</Text>
                        <Text style={styles.emptySubtext}>Pull down to refresh</Text>
                    </View>
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F1C',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#00D9FF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#8B9DC3',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    eventCard: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1E293B',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    eventImage: {
        width: '100%',
        height: 200,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 200,
    },
    eventInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
    },
    eventTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    eventDate: {
        fontSize: 14,
        color: '#E0E7FF',
    },
    eventPrice: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00D9FF',
    },
    eventLocation: {
        fontSize: 13,
        color: '#8B9DC3',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0A0F1C',
    },
    loadingText: {
        marginTop: 12,
        color: '#8B9DC3',
        fontSize: 16,
    },
    empty: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#8B9DC3',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#64748B',
    },
})
