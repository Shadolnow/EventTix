import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, User, Reply, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReviewSectionProps {
    eventId: string;
    eventEnded: boolean;
    isOrganizer?: boolean;
}

export const ReviewSection = ({ eventId, eventEnded, isOrganizer = false }: ReviewSectionProps) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [newReview, setNewReview] = useState({
        name: '',
        rating: 5,
        comment: ''
    });

    useEffect(() => {
        fetchReviews();

        const channel = supabase
            .channel(`reviews-${eventId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews', filter: `event_id=eq.${eventId}` },
                (payload) => {
                    setReviews(prev => [payload.new, ...prev]);
                })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [eventId]);

    const fetchReviews = async () => {
        const { data, error } = await supabase
            .from('reviews' as any)
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });

        if (data) {
            setReviews(data);
            if (data.length > 0) {
                const avg = data.reduce((acc: number, r: any) => acc + r.rating, 0) / data.length;
                setAverageRating(avg);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('reviews' as any)
                .insert({
                    event_id: eventId,
                    attendee_name: newReview.name,
                    rating: newReview.rating,
                    comment: newReview.comment
                });

            if (error) throw error;

            toast.success('Review submitted! Thank you.');
            setNewReview({ name: '', rating: 5, comment: '' });
            fetchReviews(); // Refresh to update average
        } catch (error) {
            console.error('Error submitting review:', error);
            toast.error('Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                    Event Reviews
                </h2>
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                        <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold text-yellow-500">{averageRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({reviews.length})</span>
                    </div>
                )}
            </div>

            {/* Review Form (Only if event ended) */}
            {true && ( // In production, switch to eventEnded check
                <Card className="border-2 border-primary/20 bg-muted/20">
                    <CardHeader>
                        <CardTitle className="text-lg">Write a Review</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Input
                                        placeholder="Your Name"
                                        value={newReview.name}
                                        onChange={e => setNewReview({ ...newReview, name: e.target.value })}
                                        required
                                        className="bg-background/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-1 p-2 bg-background/50 rounded-md border border-input">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewReview({ ...newReview, rating: star })}
                                                className="transition-transform hover:scale-110 focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-6 h-6 ${star <= newReview.rating
                                                        ? 'fill-yellow-500 text-yellow-500'
                                                        : 'text-muted-foreground'
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <Textarea
                                placeholder="Share your experience..."
                                value={newReview.comment}
                                onChange={e => setNewReview({ ...newReview, comment: e.target.value })}
                                required
                                className="bg-background/50"
                            />
                            <Button type="submit" variant="cyber" disabled={isSubmitting}>
                                {isSubmitting ? 'Posting...' : 'Post Review'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Reviews List */}
            <div className="grid gap-4">
                {reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No reviews yet. Be the first to review!
                    </div>
                ) : (
                    reviews.map((review) => (
                        <Card key={review.id} className="bg-card/50 hover:bg-card/80 transition-colors border-2 border-transparent hover:border-primary/20">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                                            <span className="font-bold text-white text-xs">
                                                {review.attendee_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{review.attendee_name}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(review.created_at), 'PPP')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`w-4 h-4 ${i < review.rating
                                                    ? 'fill-yellow-500 text-yellow-500'
                                                    : 'text-muted-foreground/30'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-foreground/90 leading-relaxed">
                                    {review.comment}
                                </p>

                                {/* Organizer Reply */}
                                {review.organizer_reply && (
                                    <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-primary/5 p-3 rounded-r-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Reply className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-semibold text-primary">Organizer Response</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{review.organizer_reply}</p>
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                            {format(new Date(review.replied_at), 'PPP')}
                                        </p>
                                    </div>
                                )}

                                {/* Reply Button/Form for Organizers */}
                                {isOrganizer && !review.organizer_reply && (
                                    <div className="mt-4">
                                        {replyingTo === review.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Write your response..."
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={async () => {
                                                        try {
                                                            const { error } = await supabase
                                                                .from('reviews' as any)
                                                                .update({
                                                                    organizer_reply: replyText,
                                                                    replied_at: new Date().toISOString(),
                                                                    replied_by: user?.id
                                                                })
                                                                .eq('id', review.id);

                                                            if (error) throw error;
                                                            toast.success('Reply posted!');
                                                            setReplyingTo(null);
                                                            setReplyText('');
                                                            fetchReviews();
                                                        } catch (error) {
                                                            toast.error('Failed to post reply');
                                                        }
                                                    }}
                                                >
                                                    Post
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setReplyingTo(null);
                                                        setReplyText('');
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setReplyingTo(review.id)}
                                                className="gap-2"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                Reply
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};
