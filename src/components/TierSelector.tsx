import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, Users, Check, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/safeClient';

interface TicketTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity?: number;
  tickets_sold: number;
}

interface TierSelectorProps {
  eventId: string;
  selectedTierId: string | null;
  onSelect: (tier: TicketTier | null) => void;
  isFreeEvent?: boolean;
  discountPercent?: number;
}

export const TierSelector = ({
  eventId,
  selectedTierId,
  onSelect,
  isFreeEvent = false,
  discountPercent = 0,
}: TierSelectorProps) => {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTiers = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('ticket_tiers')
          .select('id, name, description, price, capacity, tickets_sold')
          .eq('event_id', eventId)
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (fetchError) {
          console.error('Error fetching tiers:', fetchError);
          setError('Failed to load ticket tiers');
        } else {
          setTiers(data || []);
        }
      } catch (err) {
        console.error('Error fetching tiers:', err);
        setError('Failed to load ticket tiers');
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, [eventId]);

  const isAvailable = (tier: TicketTier) => {
    if (!tier.capacity) return true;
    return tier.tickets_sold < tier.capacity;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading ticket options...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  // Show empty state if no tiers
  if (tiers.length === 0) {
    return null; // No tiers available, hide the component
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Select Ticket Type</h3>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const available = isAvailable(tier);
          const isSelected = selectedTierId === tier.id;
          const finalPrice = discountPercent > 0
            ? Math.round(tier.price * (1 - discountPercent / 100))
            : tier.price;

          return (
            <Card
              key={tier.id}
              className={cn(
                'cursor-pointer transition-all duration-200',
                'hover:shadow-lg',
                isSelected && 'ring-2 ring-primary shadow-lg shadow-primary/20',
                !available && 'opacity-50 cursor-not-allowed',
                available && !isSelected && 'hover:border-primary/50'
              )}
              onClick={() => available && onSelect(isSelected ? null : tier)}
            >
              <CardContent className="p-4">
                {/* Header: Name + Price */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-base leading-tight">
                        {tier.name}
                      </h4>
                      {isSelected && available && (
                        <div className="shrink-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Section - Clean & Clear */}
                  <div className="text-right shrink-0">
                    {isFreeEvent || tier.price === 0 ? (
                      <div className="text-xl font-bold text-green-500">FREE</div>
                    ) : (
                      <div className="space-y-1">
                        {discountPercent > 0 && (
                          <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground line-through">
                            <IndianRupee className="w-3 h-3" />
                            <span>{tier.price.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 text-xl font-bold text-foreground">
                          <IndianRupee className="w-4 h-4" />
                          <span>{finalPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {tier.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {tier.description}
                  </p>
                )}

                {/* Footer: Status Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Availability */}
                  {tier.capacity && (
                    <div className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted">
                      <Users className="w-3 h-3" />
                      <span className="font-medium">
                        {available
                          ? `${tier.capacity - tier.tickets_sold} left`
                          : 'Sold Out'
                        }
                      </span>
                    </div>
                  )}

                  {/* Discount Badge */}
                  {discountPercent > 0 && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/50 text-xs">
                      {discountPercent}% OFF
                    </Badge>
                  )}

                  {/* Sold Out Badge */}
                  {!available && (
                    <Badge variant="destructive" className="text-xs">
                      Sold Out
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Text */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <Info className="w-4 h-4 shrink-0" />
        <span>Tap a ticket type to select. You can change it before payment.</span>
      </div>
    </div>
  );
};

export default TierSelector;
