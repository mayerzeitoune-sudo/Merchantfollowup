import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  Bell, 
  Calendar, 
  Zap, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Phone,
  MessageSquare,
  Gift,
  Globe,
  FileText,
  BarChart3,
  UserPlus,
  Target,
  Shield,
  RefreshCw,
  Kanban
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { path: '/funded', label: 'Funded Deals', icon: DollarSign, badge: 'New' },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/contacts', label: 'Inbox', icon: MessageSquare },
  { path: '/templates', label: 'Templates', icon: FileText },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { divider: true, label: 'Automation' },
  { path: '/drip-campaigns', label: 'Drip Campaigns', icon: Zap },
  { path: '/revival', label: 'Lead Revival', icon: RefreshCw },
  { divider: true, label: 'Growth' },
  { path: '/lead-capture', label: 'Lead Capture', icon: UserPlus },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { divider: true, label: 'Team' },
  { path: '/team', label: 'Team Members', icon: Users },
  { divider: true, label: 'Settings' },
  { path: '/compliance', label: 'SMS Compliance', icon: Shield },
  { path: '/phone-numbers', label: 'Phone Numbers', icon: Phone },
  { path: '/domains', label: 'Domains & Email', icon: Globe },
  { path: '/gift-store', label: 'Gift Store', icon: Gift },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const logoUrl = "https://customer-assets.emergentagent.com/job_payment-tracker-471/artifacts/q3g0kgbm_Image_20260310_172432_668.png";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-secondary rounded-md"
          data-testid="mobile-menu-btn"
        >
          <Menu className="h-6 w-6" />
        </button>
        <img 
          src={logoUrl} 
          alt="Merchant Follow Up" 
          className="h-8 w-auto"
        />
        <div className="w-10" />
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-screen w-64 bg-white border-r border-border z-50
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-20 flex items-center justify-between px-4 border-b border-border sticky top-0 bg-white z-10">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <img 
                  src={logoUrl} 
                  alt="Merchant Follow Up" 
                  className="h-12 w-auto transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">MERCHANT</span>
                <span className="text-xs font-medium text-orange-500 tracking-wider">FOLLOWUP</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-secondary rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item, index) => {
              if (item.divider) {
                return (
                  <div key={index} className="pt-4 pb-2">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                );
              }
              
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-white' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                  {item.badge && !isActive && (
                    <Badge className="ml-auto bg-orange-500 text-white text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border sticky bottom-0 bg-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
