import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarDays, Ticket, ScanLine, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/public-events', icon: CalendarDays, label: 'Events' },
  { path: '/global-tickets', icon: Ticket, label: 'Tickets', auth: true },
  { path: '/scan', icon: ScanLine, label: 'Scan', auth: true },
  { path: '/dashboard', icon: User, label: 'Profile', auth: true },
];

export const MobileNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isOrganizer } = useAuth(); // Now includes RBAC flags

  // Don't show on auth page or ticket viewer
  const hiddenPaths = ['/auth', '/ticket/', '/e/', '/staff-login'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));

  if (shouldHide) return null;

  const getPath = (item: any) => {
    if (item.label === 'Profile') {
      return isAdmin ? '/dashboard' : '/profile';
    }
    return item.path;
  };

  const visibleItems = navItems.filter(item => {
    // 1. Check Auth requirement
    if (item.auth && !user) return false;

    // 2. Hide Scan for regular users
    if (item.label === 'Scan') {
      return isOrganizer || isAdmin;
    }

    // 3. Hide Profile for now? No, we redirect it.
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const targetPath = getPath(item);
          const isActive = location.pathname === targetPath ||
            (targetPath !== '/' && location.pathname.startsWith(targetPath));

          return (
            <button
              key={item.label} // Key by label as path might change
              onClick={() => navigate(targetPath)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200 active:scale-95",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
