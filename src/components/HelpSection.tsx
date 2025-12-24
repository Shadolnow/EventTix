import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface HelpSectionProps {
    title: string;
    items: (string | ReactNode)[];
    icon?: string;
    variant?: 'green' | 'blue' | 'yellow' | 'purple';
    className?: string;
}

export const HelpSection = ({
    title,
    items,
    icon = 'ℹ️',
    variant = 'green',
    className
}: HelpSectionProps) => {
    const variantStyles = {
        green: 'border-green-500/20 bg-green-500/5',
        blue: 'border-blue-500/20 bg-blue-500/10',
        yellow: 'border-yellow-500/20 bg-yellow-500/10',
        purple: 'border-purple-500/20 bg-purple-500/10'
    };

    return (
        <div className={cn(
            'p-4 rounded-lg border space-y-2',
            variantStyles[variant],
            className
        )}>
            <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                {title}
            </p>
            <div className="text-sm text-muted-foreground space-y-1.5 ml-7">
                {items.map((item, index) => (
                    <p key={index}>✓ {item}</p>
                ))}
            </div>
        </div>
    );
};
