'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';
import { api, getApiError } from '@/lib/api';
import type { Paginated, Notification as AppNotification } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const icon = (d: string) => (
  <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const USER_NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Tableau de bord', icon: icon('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6') },
  { href: '/requests',      label: 'Mes demandes',    icon: icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z') },
  { href: '/documents',     label: 'Mes documents',   icon: icon('M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4') },
  { href: '/notifications', label: 'Notifications',   icon: icon('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9') },
  { href: '/profile',       label: 'Mon profil',      icon: icon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z') },
  { href: '/settings',      label: 'Paramètres',      icon: icon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z') },
];

// Admin nav — items sans le groupe "Utilisateurs" qui est géré séparément
const ADMIN_NAV_TOP: NavItem[] = [
  { href: '/admin/dashboard',            label: 'Tableau de bord',    icon: icon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z') },
  { href: '/admin/requests',             label: 'Demandes',           icon: icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01') },
];

const ADMIN_NAV_BOTTOM: NavItem[] = [
  { href: '/admin/grades',               label: 'Grades',             icon: icon('M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10') },
  { href: '/admin/organizational-units', label: 'Départements',       icon: icon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4') },
  { href: '/admin/documents',            label: 'Types de documents', icon: icon('M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z') },
  { href: '/notifications',              label: 'Notifications',      icon: icon('M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9') },
  { href: '/admin/audit',                label: "Journal d'audit",    icon: icon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2') },
  { href: '/profile',                    label: 'Mon profil',         icon: icon('M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z') },
];

// Sous-items du groupe "Utilisateurs"
const USER_SUB: NavItem[] = [
  {
    href: '/admin/users',
    label: 'Professeurs & Employés',
    icon: icon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  },
  {
    href: '/admin/admins',
    label: 'Administrateurs',
    icon: icon('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, isAdmin, logout } = useAuth();

  // Ouvrir le groupe si on est déjà sur une page utilisateur
  const usersGroupActive = pathname.startsWith('/admin/users') || pathname.startsWith('/admin/admins');
  const [usersOpen, setUsersOpen] = useState(usersGroupActive);

  const { data: notifData } = useQuery<Paginated<AppNotification>>({
    queryKey: ['notifications-count'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 30_000,
  });
  const unread = notifData?.data.filter(n => !n.read_at).length ?? 0;

  const handleLogout = async () => {
    try { await logout(); router.replace('/login'); }
    catch (err) { toast.error(getApiError(err)); }
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active =
      pathname === item.href ||
      (item.href !== '/dashboard' && item.href !== '/notifications' && item.href !== '/profile' && pathname.startsWith(item.href));
    return (
      <li>
        <Link
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
            ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {item.href === '/notifications' && unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">FST RH</p>
          <p className="text-xs text-gray-400">Mohammedia</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {isAdmin() ? (
          <ul className="flex flex-col gap-0.5">
            {/* Top items */}
            {ADMIN_NAV_TOP.map(item => <NavLink key={item.href} item={item} />)}

            {/* Groupe Utilisateurs avec dropdown */}
            <li>
              <button
                onClick={() => setUsersOpen(v => !v)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${usersGroupActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
              >
                {icon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z')}
                <span className="flex-1 text-left">Utilisateurs</span>
                <svg
                  className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${usersOpen ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Sous-menu */}
              {usersOpen && (
                <ul className="mt-0.5 ml-3 flex flex-col gap-0.5 border-l-2 border-gray-100 pl-3">
                  {USER_SUB.map(sub => {
                    const active = pathname === sub.href || pathname.startsWith(sub.href + '/');
                    return (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors
                            ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Bottom items */}
            {ADMIN_NAV_BOTTOM.map(item => <NavLink key={item.href} item={item} />)}
          </ul>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {USER_NAV.map(item => <NavLink key={item.href} item={item} />)}
          </ul>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="mb-2 rounded-lg bg-gray-50 px-3 py-2">
          <p className="truncate text-xs font-medium text-gray-800">
            {user?.staff_profile
              ? `${user.staff_profile.prenom_fr} ${user.staff_profile.nom_fr}`
              : user?.email}
          </p>
          <p className="truncate text-xs text-gray-400">{user?.email}</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium
            ${isAdmin() ? 'bg-purple-100 text-purple-700' : user?.role === 'PROFESSEUR' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
