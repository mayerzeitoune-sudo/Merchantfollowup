import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  MessageSquare, 
  Zap, 
  BarChart3, 
  Target,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  Building2,
  Home,
  Car,
  Heart,
  Shield,
  Briefcase,
  Star
} from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Users,
      title: "Lead Management",
      description: "Organize and track all your leads in one place with custom tags, notes, and pipeline stages."
    },
    {
      icon: Target,
      title: "Visual Pipeline",
      description: "Drag-and-drop Kanban board to move leads through your sales process effortlessly."
    },
    {
      icon: MessageSquare,
      title: "Automated SMS & Email",
      description: "Send personalized follow-ups automatically. Never let a lead slip through the cracks."
    },
    {
      icon: Zap,
      title: "Drip Campaigns",
      description: "Create multi-step sequences that nurture leads over time with smart auto-stop on reply."
    },
    {
      icon: Sparkles,
      title: "AI-Powered Messaging",
      description: "Generate professional messages instantly with AI. Multiple tones for every situation."
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Track response rates, campaign performance, and team productivity in real-time."
    },
    {
      icon: Clock,
      title: "Smart Reminders",
      description: "Set follow-up reminders and never miss an opportunity to close a deal."
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Invite your team with role-based permissions. Admins, agents, and viewers."
    }
  ];

  const industries = [
    { icon: Home, name: "Real Estate", color: "bg-blue-100 text-blue-700" },
    { icon: Shield, name: "Insurance", color: "bg-green-100 text-green-700" },
    { icon: Building2, name: "Home Services", color: "bg-orange-100 text-orange-700" },
    { icon: Heart, name: "Healthcare", color: "bg-red-100 text-red-700" },
    { icon: Car, name: "Automotive", color: "bg-purple-100 text-purple-700" },
    { icon: Briefcase, name: "Professional Services", color: "bg-cyan-100 text-cyan-700" },
  ];

  const testimonials = [
    {
      quote: "This platform transformed how we manage leads. Our response time improved by 300%.",
      author: "Sarah Johnson",
      role: "Sales Director",
      company: "Premier Realty"
    },
    {
      quote: "The automated follow-ups alone have increased our conversion rate significantly.",
      author: "Michael Chen",
      role: "Agency Owner",
      company: "Shield Insurance Group"
    },
    {
      quote: "Finally, a CRM that's simple enough for my team to actually use daily.",
      author: "David Martinez",
      role: "Operations Manager",
      company: "ProServe HVAC"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 font-['Outfit']">Merchant</h1>
                <p className="text-xs text-orange-600 font-medium -mt-1">FOLLOW UP</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Features</a>
              <a href="#industries" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Industries</a>
              <a href="#product" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Product</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Testimonials</a>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" className="font-medium">
                  Log In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-orange-600 hover:bg-orange-700 font-medium">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-orange-100 text-orange-700 hover:bg-orange-100">
              <Sparkles className="h-3 w-3 mr-1" />
              AI-Powered Lead Management
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 font-['Outfit'] leading-tight">
              Turn More Leads Into
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-500"> Customers</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
              The all-in-one platform to capture, nurture, and convert leads with automated SMS, 
              email campaigns, and AI-powered follow-ups. Built for every industry.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-lg px-8 h-14 font-medium">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#product">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 font-medium">
                  See How It Works
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required • Free 14-day trial • Cancel anytime
            </p>
          </div>

          {/* Hero Image - Dashboard Preview */}
          <div className="mt-20 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gradient-to-br from-slate-100 to-slate-200 p-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl">Dashboard Overview</h3>
                    <p className="text-gray-500 text-sm">Real-time insights at your fingertips</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Total Clients</p>
                    <p className="text-2xl font-bold text-blue-700">1,247</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Total Funded</p>
                    <p className="text-2xl font-bold text-green-700">$2.4M</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">Active Campaigns</p>
                    <p className="text-2xl font-bold text-orange-700">23</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600">Response Rate</p>
                    <p className="text-2xl font-bold text-purple-700">34%</p>
                  </div>
                </div>
                <div className="h-32 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Analytics Chart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-12 bg-gray-50 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">10,000+</p>
              <p className="text-sm text-gray-600">Leads Managed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">500+</p>
              <p className="text-sm text-gray-600">Active Businesses</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">1M+</p>
              <p className="text-sm text-gray-600">Messages Sent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">4.9/5</p>
              <p className="text-sm text-gray-600">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">Features</Badge>
            <h2 className="text-4xl font-bold text-gray-900 font-['Outfit']">
              Everything You Need to Close More Deals
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Powerful tools designed to help you capture, nurture, and convert leads faster than ever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-100">Industries</Badge>
            <h2 className="text-4xl font-bold text-gray-900 font-['Outfit']">
              Built for Every Industry
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Whether you're in real estate, insurance, healthcare, or any service business, 
              Merchant Follow Up adapts to your workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className={`h-14 w-14 rounded-full ${industry.color} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{industry.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Product Screenshots Section */}
      <section id="product" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-100">Product Tour</Badge>
            <h2 className="text-4xl font-bold text-gray-900 font-['Outfit']">
              See Merchant Follow Up in Action
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              A beautiful, intuitive interface that your team will actually want to use.
            </p>
          </div>

          {/* Pipeline Screenshot */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Visual Deal Pipeline</h3>
                <p className="text-gray-600 mb-6">
                  Drag and drop leads through your sales stages. See exactly where every opportunity stands 
                  at a glance with our Kanban-style pipeline view.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Customizable pipeline stages</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Drag-and-drop interface</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Real-time pipeline analytics</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl border bg-gradient-to-br from-slate-100 to-slate-200 p-6">
                <div className="bg-white rounded-xl p-4">
                  <h4 className="font-semibold mb-4">Deal Pipeline</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {['New Lead', 'Interested', 'Application', 'Approved', 'Funded'].map((stage, i) => (
                      <div key={i} className="flex-shrink-0 w-36 bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">{stage}</p>
                        <div className="space-y-2">
                          <div className="bg-white p-2 rounded border text-xs shadow-sm">
                            <p className="font-medium">John Smith</p>
                            <p className="text-gray-500">$15,000</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clients Screenshot */}
          <div className="mb-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 rounded-2xl overflow-hidden shadow-xl border bg-gradient-to-br from-slate-100 to-slate-200 p-6">
                <div className="bg-white rounded-xl p-4">
                  <h4 className="font-semibold mb-4">Clients</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Sarah Johnson', tag: 'Interested', company: 'ABC Corp' },
                      { name: 'Mike Williams', tag: 'Funded', company: 'XYZ Inc' },
                      { name: 'Emily Davis', tag: 'New Lead', company: 'Tech Solutions' }
                    ].map((client, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                            {client.name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{client.name}</p>
                            <p className="text-xs text-gray-500">{client.company}</p>
                          </div>
                        </div>
                        <Badge className={client.tag === 'Funded' ? 'bg-green-100 text-green-700' : client.tag === 'Interested' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                          {client.tag}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Contact Management</h3>
                <p className="text-gray-600 mb-6">
                  Keep all your client information organized with tags, notes, and complete conversation history. 
                  Never lose track of a lead again.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Custom tags and filters</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Complete conversation history</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">AI-powered client summaries</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Campaigns Screenshot */}
          <div>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Automated Drip Campaigns</h3>
                <p className="text-gray-600 mb-6">
                  Create powerful multi-step sequences that automatically nurture your leads. 
                  Set it up once and let the system do the follow-up for you.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Multi-step SMS & email sequences</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Smart auto-stop on reply</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">AI-generated message content</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden shadow-xl border bg-gradient-to-br from-slate-100 to-slate-200 p-6">
                <div className="bg-white rounded-xl p-4">
                  <h4 className="font-semibold mb-4">Drip Campaign Builder</h4>
                  <div className="space-y-3">
                    {[
                      { day: 'Day 1', msg: 'Welcome message' },
                      { day: 'Day 3', msg: 'Follow-up with offer' },
                      { day: 'Day 7', msg: 'Check-in message' }
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">{step.day}</p>
                          <p className="text-sm font-medium">{step.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/20 text-orange-400 hover:bg-orange-500/20">Testimonials</Badge>
            <h2 className="text-4xl font-bold text-white font-['Outfit']">
              Loved by Businesses Everywhere
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              See what our customers have to say about Merchant Follow Up.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-400">{testimonial.role}, {testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-600 to-orange-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white font-['Outfit'] mb-6">
            Ready to Convert More Leads?
          </h2>
          <p className="text-xl text-orange-100 mb-10">
            Join hundreds of businesses already using Merchant Follow Up to grow their customer base.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 h-14 font-medium">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 h-14 font-medium">
                Log In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white font-['Outfit']">Merchant</h1>
                  <p className="text-xs text-orange-500 font-medium -mt-1">FOLLOW UP</p>
                </div>
              </div>
              <p className="text-sm">
                The all-in-one lead management platform for growing businesses.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#industries" className="hover:text-white transition">Industries</a></li>
                <li><a href="#product" className="hover:text-white transition">Product Tour</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About Us</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  support@merchantfollowup.com
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  (555) 123-4567
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Merchant Follow Up. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
