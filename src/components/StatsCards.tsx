import { Card } from "@/components/ui/card";
import {
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    IndianRupee,
    Ticket,
    TrendingUp,
    AlertCircle
} from "lucide-react";

interface StatsCardsProps {
    stats: {
        total: number;
        pending: number;
        processing?: number;
        completed: number;
        cancelled?: number;
        revenue: number;
        validated?: number;
        todayCount?: number;
    };
    type?: "orders" | "tickets";
}

export function StatsCards({ stats, type = "tickets" }: StatsCardsProps) {
    const cards = type === "orders" ? [
        {
            label: "Total Orders",
            value: stats.total,
            icon: Ticket,
            color: "text-foreground",
            borderColor: "border-border",
        },
        {
            label: "Pending",
            value: stats.pending,
            icon: Clock,
            color: "text-yellow-400",
            borderColor: "border-yellow-500/30",
        },
        {
            label: "Processing",
            value: stats.processing || 0,
            icon: AlertCircle,
            color: "text-blue-400",
            borderColor: "border-blue-500/30",
        },
        {
            label: "Completed",
            value: stats.completed,
            icon: CheckCircle2,
            color: "text-green-400",
            borderColor: "border-green-500/30",
        },
        {
            label: "Revenue",
            value: `₹${stats.revenue.toLocaleString()}`,
            icon: IndianRupee,
            color: "text-primary",
            borderColor: "border-primary/30",
            isRevenue: true,
        },
    ] : [
        {
            label: "Total Tickets",
            value: stats.total,
            icon: Ticket,
            color: "text-foreground",
            borderColor: "border-border",
        },
        {
            label: "Pending Payment",
            value: stats.pending,
            icon: Clock,
            color: "text-yellow-400",
            borderColor: "border-yellow-500/30",
        },
        {
            label: "Validated",
            value: stats.validated || 0,
            icon: CheckCircle2,
            color: "text-green-400",
            borderColor: "border-green-500/30",
        },
        {
            label: "Today's Sales",
            value: stats.todayCount || 0,
            icon: TrendingUp,
            color: "text-blue-400",
            borderColor: "border-blue-500/30",
        },
        {
            label: "Revenue",
            value: `₹${stats.revenue.toLocaleString()}`,
            icon: IndianRupee,
            color: "text-primary",
            borderColor: "border-primary/30",
            isRevenue: true,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {cards.map((card, index) => {
                const Icon = card.icon;
                return (
                    <Card
                        key={index}
                        className={`p-4 bg-card border ${card.borderColor} hover:scale-[1.02] transition-transform`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{card.label}</p>
                                <p className={`text-xl font-bold ${card.color}`}>
                                    {card.value}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
