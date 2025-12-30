import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, Ticket, BarChart4 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface EventStatsProps {
  totalTickets: number;
  validatedTickets: number;
  pendingTickets: number;
  attendees: any[];
  tiers?: any[];
}

export const EventStats = ({ totalTickets, validatedTickets, pendingTickets, attendees, tiers = [] }: EventStatsProps) => {
  const stats = [
    {
      title: 'Total Tickets',
      value: totalTickets,
      icon: Ticket,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Validated',
      value: validatedTickets,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Pending',
      value: pendingTickets,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Attendees',
      value: attendees.length,
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-2 border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Tier Capacity Bars */}
      {tiers.length > 0 && (
        <Card className="border-2 border-primary/20 bg-background/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart4 className="w-5 h-5 text-primary" />
              Live Tier Capacity & Entry Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tiers.map((tier) => {
                const tierAttendees = attendees.filter(t => t.tier_id === tier.id);
                const soldCount = tierAttendees.length;
                const validatedCount = tierAttendees.filter(t => t.is_validated).length;
                const capacity = tier.capacity || soldCount;

                const soldPercentage = capacity > 0 ? (soldCount / capacity) * 100 : 0;
                const enteredPercentage = soldCount > 0 ? (validatedCount / soldCount) * 100 : 0;

                return (
                  <div key={tier.id} className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <h4 className="font-bold text-primary">{tier.name}</h4>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tier Monitoring</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{soldCount} / {tier.capacity || '∞'}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">Tickets Sold</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight mb-1">
                        <span className="text-muted-foreground">Sales Progress</span>
                        <span className="font-mono">{Math.round(soldPercentage)}%</span>
                      </div>
                      <Progress value={soldPercentage} className="h-1.5 bg-primary/10" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-tight mb-1">
                        <span className="text-muted-foreground">Entry Progress (Scanned)</span>
                        <span className="font-mono text-green-500">{Math.round(enteredPercentage)}%</span>
                      </div>
                      <Progress value={enteredPercentage} className="h-1.5 bg-green-500/10" indicatorClassName="bg-green-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};