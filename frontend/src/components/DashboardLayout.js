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
  Kanban,
  DollarSign,
  Building2,
  Activity,
  UsersRound,
  ArrowLeftCircle,
  Eye
} from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import PhoneDialer from './PhoneDialer';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/pipeline', label: 'Pipeline', icon: Kanban },
  { path: '/funded', label: 'Projections', icon: DollarSign, badge: 'New' },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/inbox', label: 'Inbox', icon: MessageSquare },
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
  { path: '/my-team', label: 'My Team', icon: UsersRound, teamLeaderOnly: true },
  { path: '/organizations', label: 'Organizations', icon: Building2, orgAdminOnly: true },
  { path: '/activity', label: 'Activity Log', icon: Activity, adminOnly: true },
  { path: '/billing', label: 'Billing', icon: BarChart3, adminOnlyNotOrgAdmin: true },
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
  const { user, logout, isImpersonating, impersonator, stopImpersonation } = useAuth();

  const logoUrl = "https://customer-assets.emergentagent.com/job_8de675b6-2eb0-4aa2-9eba-eeadd9657b38/artifacts/gcg3jc1g_Image_20260311_161856_605.png";

  const handleLogout = () => {
    // Navigate first, then logout to avoid ProtectedRoute redirect
    navigate('/');
    // Small delay to ensure navigation completes before auth state changes
    setTimeout(() => {
      logout();
    }, 100);
  };

  const handleStopImpersonation = async () => {
    await stopImpersonation();
    navigate('/organizations');
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 bg-orange-600 text-white py-2 px-4 z-[100] flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5" />
            <span className="text-sm font-medium">
              Viewing as <strong>{user?.name}</strong> ({user?.email}) 
              {user?.org_name && <span className="ml-1">• {user?.org_name}</span>}
            </span>
            {impersonator && (
              <span className="text-orange-200 text-xs">
                (Logged in by: {impersonator.name})
              </span>
            )}
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleStopImpersonation}
            className="bg-white text-orange-600 hover:bg-orange-50"
          >
            <ArrowLeftCircle className="h-4 w-4 mr-1" />
            Return to Org Admin
          </Button>
        </div>
      )}
      {/* Mobile Header */}
      <header className={`lg:hidden fixed left-0 right-0 h-16 bg-white border-b border-border z-50 flex items-center justify-between px-4 ${isImpersonating ? 'top-10' : 'top-0'}`}>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-secondary rounded-md"
          data-testid="mobile-menu-btn"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <img 
            src={logoUrl} 
            alt="Merchant Follow Up" 
            className="h-10 w-auto"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight">MERCHANT</span>
            <span className="text-xs font-semibold text-orange-500">FOLLOWUP</span>
          </div>
        </div>
        <NotificationBell />
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
                <span className="text-sm font-bold text-gray-900 leading-tight tracking-wide">MERCHANT</span>
                <span className="text-xs font-semibold text-orange-500 tracking-wider">FOLLOWUP</span>
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
            {navItems.filter(item => {
              // Filter org admin only items
              if (item.orgAdminOnly && user?.role !== 'org_admin') return false;
              // Filter admin only items (includes org_admin)
              if (item.adminOnly && !['admin', 'org_admin'].includes(user?.role)) return false;
              // Filter admin only but NOT org_admin (for regular admin billing page)
              if (item.adminOnlyNotOrgAdmin && (user?.role === 'org_admin' || !['admin'].includes(user?.role))) return false;
              // Filter team leader only items
              if (item.teamLeaderOnly && !['team_leader', 'admin', 'org_admin'].includes(user?.role)) return false;
              return true;
            }).map((item, index) => {
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
            <Link to="/profile" className="flex items-center gap-3 mb-4 p-2 -m-2 rounded-lg hover:bg-secondary/50 transition-colors" data-testid="profile-link">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </Link>
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
      <main className={`lg:ml-64 min-h-screen ${isImpersonating ? 'pt-26 lg:pt-10' : 'pt-16 lg:pt-0'}`}>
        {/* Desktop Top Bar */}
        <div className="hidden lg:flex items-center justify-between h-16 px-8 bg-white border-b border-border">
          <GlobalSearch />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="text-sm text-right">
              <p className="font-medium">{user?.name || user?.email}</p>
              <p className="text-muted-foreground text-xs capitalize">
                {user?.role || 'User'}
                {isImpersonating && <span className="ml-1 text-orange-500">(Viewing)</span>}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
      
      {/* Phone Dialer - Floating Button */}
      <PhoneDialer />
    </div>
  );
};

export default DashboardLayout;
