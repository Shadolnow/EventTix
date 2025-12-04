import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Ticket, Zap, Building2, ArrowLeft } from 'lucide-react';

const plans = [
  {
    id: 'pay_as_you_go',
    name: 'Pay As You Go',
    description: 'Perfect for occasional event organizers',
    price: '₹499',
    priceNote: 'per event',
    features: [
      'Create single events',
      'Unlimited tickets per event',
      'QR code validation',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Get Started',
    popular: false,
    gradient: 'from-gray-500 to-gray-700',
    borderColor: 'border-border',
    bgColor: 'bg-card',
  },
  {
    id: 'monthly',
    name: 'Monthly',
    description: 'For growing businesses with regular events',
    price: '₹2,999',
    priceNote: 'per month',
    features: [
      'Unlimited events',
      'Unlimited tickets',
      'Advanced analytics',
      'Custom branding',
      'Priority support',
      'Team collaboration',
    ],
    cta: 'Subscribe Monthly',
    popular: true,
    gradient: 'from-primary to-accent',
    borderColor: 'border-primary/50',
    bgColor: 'bg-primary/5',
  },
  {
    id: 'annual',
    name: 'Annual',
    description: 'Best value for established organizations',
    price: '₹24,999',
    priceNote: 'per year (save 30%)',
    features: [
      'Everything in Monthly',
      'White-label solution',
      'API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Subscribe Annually',
    popular: false,
    gradient: 'from-accent to-secondary',
    borderColor: 'border-accent/50',
    bgColor: 'bg-accent/5',
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Ticket className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-gradient-cyber">EventTix</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-10 w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
            <Building2 className="w-3 h-3 mr-1" />
            For Businesses
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-gradient-cyber">Simple, Transparent</span>
            <br />
            <span className="text-foreground">Pricing</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your business. Scale your events without limits.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative ${plan.bgColor} ${plan.borderColor} border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-neon-cyan">
                      <Zap className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${plan.gradient} rounded-t-lg`} />
                
                <CardHeader className="pt-8">
                  <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div>
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">{plan.priceNote}</span>
                  </div>
                  
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3 text-muted-foreground">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Link to={`/business-signup?plan=${plan.id}`} className="w-full">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-neon-cyan'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 border-t border-border">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12 text-gradient-cyber">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-2">Can I switch plans later?</h3>
              <p className="text-muted-foreground">Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">We accept all major credit cards, UPI, net banking, and digital wallets.</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <h3 className="font-semibold text-foreground mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">Yes! All new business accounts get a 14-day free trial with full access to all features.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
