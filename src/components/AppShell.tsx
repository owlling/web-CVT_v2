import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Gamepad2, ImageIcon, Palette, ScanSearch, Sparkles, Languages, Clapperboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { copy } from '@/data/appData';
import { useAppStore } from '@/store/appStore';

const navItems = [
  { to: '/', key: 'home', icon: Sparkles },
  { to: '/image', key: 'image', icon: ImageIcon },
  { to: '/video', key: 'video', icon: Clapperboard },
  { to: '/color', key: 'color', icon: Palette },
  { to: '/contrast', key: 'contrast', icon: ScanSearch },
  { to: '/games', key: 'games', icon: Gamepad2 },
] as const;

export default function AppShell() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const text = copy[language];
  const [collapsed, setCollapsed] = useState(false);

  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="min-h-screen text-stone-900">
      <div className="min-h-screen">
        <aside
          className={[
            'theme-sidebar fixed left-0 top-0 z-20 hidden h-screen overflow-hidden bg-transparent p-4 lg:block lg:p-5 border-r border-stone-200',
            'transition-[width] duration-300 ease-in-out',
            collapsed ? 'lg:w-[88px]' : 'lg:w-[288px]',
          ].join(' ')}
        >
          <div className="flex h-full flex-col overflow-y-auto">
            <div className="flex-1 overflow-y-auto transition-all duration-200 ease-in-out">
              {/* Logo */}
              <div
                className={[
                  'flex items-center border-b border-stone-200 overflow-hidden transition-all duration-200 ease-in-out',
                  collapsed ? 'justify-center gap-0 pb-4' : 'gap-3 pb-4',
                ].join(' ')}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-none bg-[#F5EFE8]">
                  <svg className="h-8 w-8" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M200.004 75C261.116 75 315.637 113.567 363.446 188.908C365.553 192.224 366.672 196.071 366.672 200C366.672 203.929 365.553 207.776 363.446 211.092C315.637 286.433 261.116 325 200.004 325C138.891 325 84.3706 286.433 36.5622 211.092C34.455 207.776 33.3359 203.929 33.3359 200C33.3359 196.071 34.455 192.224 36.5622 188.908C84.3706 113.567 138.891 75 200.004 75ZM200.004 125C158.583 125 125.004 158.579 125.004 200C125.004 241.421 158.583 275 200.004 275C241.425 275 275.004 241.421 275.004 200C275.004 158.579 241.425 125 200.004 125Z" fill="url(#appShellLogoGradient)" />
                    <path d="M200 250C172.385 250 150 227.615 150 200C150 172.385 172.385 150 200 150C227.615 150 250 172.385 250 200C250 227.615 227.615 250 200 250ZM200 240V160C189.391 160 179.217 164.214 171.716 171.716C164.214 179.217 160 189.391 160 200C160 210.609 164.214 220.783 171.716 228.284C179.217 235.786 189.391 240 200 240Z" fill="#1C1917" />
                    <defs>
                      <linearGradient id="appShellLogoGradient" x1="200.004" y1="75" x2="200.004" y2="325" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#F08048" />
                        <stop offset="1" stop-color="#D95022" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div
                  className={[
                    'min-w-0 flex-1 overflow-hidden transition-opacity duration-200 ease-in-out',
                    collapsed ? 'opacity-0 pointer-events-none w-0' : 'opacity-100',
                  ].join(' ')}
                >
                  <p className="truncate text-xl font-semibold tracking-[-0.03em] text-stone-950">
                    {text.brand}
                  </p>
                  <p className="theme-kicker mt-1 truncate">COLOR VISION TESTER</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="mt-4 space-y-2 transition-all duration-200 ease-in-out">
                {navItems.map(({ to, key, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      [
                        'flex items-center overflow-hidden rounded-none border text-sm font-semibold transition-colors duration-200',
                        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3',
                        isActive
                          ? 'border-[#d6643e] bg-[#d6643e] text-stone-50'
                          : 'border-transparent bg-transparent text-stone-600 hover:border-stone-200 hover:bg-stone-50 hover:text-[#d6643e]',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={[
                        'truncate transition-opacity duration-200 ease-in-out',
                        collapsed ? 'opacity-0 w-0' : 'opacity-100',
                      ].join(' ')}
                    >
                      {text.nav[key]}
                    </span>
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Language panel - above collapse button, hidden when collapsed */}
            <div
              className={[
                'transition-all duration-300 ease-in-out overflow-hidden shrink-0',
                collapsed ? 'max-h-0 opacity-0' : 'mt-4 max-h-[300px] opacity-100',
              ].join(' ')}
            >
              <div className="rounded-none border bg-transparent p-4">
                <div className="theme-kicker mb-3 flex items-center gap-2">
                  <Languages className="h-4 w-4 shrink-0" />
                  <span className="truncate">{text.common.locale}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['zh', 'en'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setLanguage(item)}
                      className={[
                        'rounded-none border px-3 py-2 text-[13px] font-semibold transition-colors duration-200',
                        language === item
                          ? 'border-0 border-solid border-[#000000] bg-[#f4efe7] text-[#d6643e]'
                          : 'border-0 border-solid border-[#000000] bg-[#f7f7f4] text-stone-600 hover:border-[#d6643e] hover:bg-[#fff3eb]',
                      ].join(' ')}
                    >
                      {item === 'zh' ? '中文' : 'EN'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapse button - pinned at bottom */}
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className={[
                'flex shrink-0 items-center overflow-hidden rounded-none border border-stone-200 text-sm font-semibold text-stone-500 transition-colors duration-200 hover:bg-stone-50 hover:text-[#d6643e]',
                collapsed ? 'mt-4 justify-center px-0 py-3' : 'mt-4 gap-3 px-4 py-3',
              ].join(' ')}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <CollapseIcon className="h-4 w-4 shrink-0" />
              <span
                className={[
                  'truncate transition-opacity duration-200 ease-in-out',
                  collapsed ? 'opacity-0 w-0' : 'opacity-100',
                ].join(' ')}
              >
                {language === 'zh' ? '收起侧栏' : 'Collapse'}
              </span>
            </button>
          </div>
        </aside>

        <main
          className={[
            'flex w-auto flex-1 justify-center overflow-x-hidden transition-[margin] duration-300 ease-in-out',
            collapsed ? 'lg:ml-[88px]' : 'lg:ml-[288px]',
          ].join(' ')}
        >
          <div className="mx-auto min-w-0 w-full max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
