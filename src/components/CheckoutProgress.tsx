import { Check, User, Mail, CreditCard, Ticket } from 'lucide-react';

interface CheckoutStep {
    id: string;
    label: string;
    icon: React.ElementType;
}

const steps: CheckoutStep[] = [
    { id: 'details', label: 'Your Details', icon: User },
    { id: 'verify', label: 'Verify Email', icon: Mail },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'confirm', label: 'Get Ticket', icon: Ticket }
];

interface CheckoutProgressProps {
    currentStep: 'details' | 'verify' | 'payment' | 'confirm';
}

export const CheckoutProgress = ({ currentStep }: CheckoutProgressProps) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <div className="w-full py-4">
            {/* Mobile: Compact view */}
            <div className="md:hidden">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">
                        Step {currentIndex + 1} of {steps.length}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {steps[currentIndex]?.label}
                    </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                        style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Desktop: Full step indicator */}
            <div className="hidden md:flex items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isPending = index > currentIndex;
                    const Icon = step.icon;

                    return (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : isCurrent
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-muted border-border text-muted-foreground'
                                        }`}
                                >
                                    {isCompleted ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                                    }`}>
                                    {step.label}
                                </span>
                            </div>

                            {index < steps.length - 1 && (
                                <div className="flex-1 mx-4">
                                    <div className={`h-0.5 transition-all duration-500 ${isCompleted ? 'bg-primary' : 'bg-border'
                                        }`} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface FormErrorProps {
    message: string;
}

export const FormError = ({ message }: FormErrorProps) => (
    <div className="flex items-center gap-2 text-destructive text-sm mt-1 animate-in slide-in-from-top-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{message}</span>
    </div>
);

interface FormSuccessProps {
    message: string;
}

export const FormSuccess = ({ message }: FormSuccessProps) => (
    <div className="flex items-center gap-2 text-green-500 text-sm mt-1 animate-in slide-in-from-top-1">
        <Check className="w-4 h-4" />
        <span>{message}</span>
    </div>
);
