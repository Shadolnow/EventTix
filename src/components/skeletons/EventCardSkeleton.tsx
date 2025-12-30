import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const EventCardSkeleton = () => {
    return (
        <Card className="border-2 border-primary/20 animate-pulse">
            <CardHeader className="p-0">
                <div className="h-48 bg-muted rounded-t-lg" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                </div>
                <div className="flex gap-4">
                    <div className="h-4 bg-muted rounded w-24" />
                    <div className="h-4 bg-muted rounded w-32" />
                </div>
                <div className="h-10 bg-muted rounded w-full" />
            </CardContent>
        </Card>
    );
};

export const EventGridSkeleton = ({ count = 6 }: { count?: number }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    );
};
