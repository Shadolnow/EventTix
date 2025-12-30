import { Card, CardContent } from '@/components/ui/card';

export const TicketCardSkeleton = () => {
    return (
        <Card className="animate-pulse">
            <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                        <div className="h-5 bg-muted rounded w-32" />
                        <div className="h-6 bg-muted rounded w-48" />
                    </div>
                    <div className="h-20 w-20 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-4 bg-muted rounded w-36" />
                    <div className="h-4 bg-muted rounded w-44" />
                </div>
                <div className="h-px bg-muted" />
                <div className="flex gap-2">
                    <div className="h-8 bg-muted rounded flex-1" />
                    <div className="h-8 bg-muted rounded flex-1" />
                </div>
            </CardContent>
        </Card>
    );
};

export const TicketListSkeleton = ({ count = 4 }: { count?: number }) => {
    return (
        <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <TicketCardSkeleton key={i} />
            ))}
        </div>
    );
};

export const TableRowSkeleton = () => {
    return (
        <tr className="animate-pulse">
            <td className="p-4"><div className="h-4 bg-muted rounded w-full" /></td>
            <td className="p-4"><div className="h-4 bg-muted rounded w-full" /></td>
            <td className="p-4"><div className="h-4 bg-muted rounded w-full" /></td>
            <td className="p-4"><div className="h-4 bg-muted rounded w-20" /></td>
        </tr>
    );
};

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRowSkeleton key={i} />
            ))}
        </>
    );
};
