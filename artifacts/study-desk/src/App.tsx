import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Atom,
  Bell,
  BookOpen,
  Check,
  CircleHelp,
  ExternalLink,
  GraduationCap,
  Home as HomeIcon,
  KeyRound,
  LineChart,
  Menu,
  PanelTop,
  Send,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Resource = {
  id: string;
  name: string;
  initials: string;
  category: string;
  icon: typeof Atom;
};

const resources: Resource[] = [
  { id: 'physics-wallah', name: 'Physics Wallah', initials: 'PW', category: 'Science room', icon: Atom },
  { id: 'next-toppers', name: 'Next Toppers', initials: 'NT', category: 'Exam prep', icon: ArrowRight },
  { id: 'mission-jee', name: 'Mission JEE', initials: 'JEE', category: 'Engineering', icon: GraduationCap },
  { id: 'master-sahab', name: 'Master Sahab', initials: 'MS', category: 'Study sessions', icon: Users },
  { id: 'vibrant', name: 'Vibrant', initials: 'VB', category: 'Daily practice', icon: LineChart },
  { id: 'desk-library', name: 'Desk Library', initials: 'DL', category: 'Reading room', icon: BookOpen },
];

const navItems = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  ...resources.map((resource) => ({ id: resource.id, label: resource.name, icon: resource.icon })),
];

function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('home');
  const [toast, setToast] = useState('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || communityOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen, communityOpen]);

  const selectResource = (resource: Resource) => {
    setActiveNav(resource.id);
    setToast(`${resource.name} is ready when you are.`);
  };

  const selectNav = (id: string) => {
    setActiveNav(id);
    setDrawerOpen(false);
    if (id === 'home') {
      setLocation('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const resource = resources.find((item) => item.id === id);
    if (resource) setToast(`${resource.name} is ready when you are.`);
  };

  return (
    <main className="app-shell">
      <div className="content-frame">
        <header className="topbar">
          <button
            className="icon-button"
            aria-label="Open navigation"
            data-testid="button-open-navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={21} strokeWidth={1.8} />
          </button>
          <button
            className="brand-lockup"
            data-testid="button-brand-home"
            onClick={() => selectNav('home')}
            aria-label="Study Desk home"
          >
            <span className="brand-mark"><PanelTop size={19} strokeWidth={1.8} /></span>
            <span className="brand-word">Study<em>Desk</em></span>
          </button>
          <button
            className="icon-button"
            aria-label="Open Study Desk community"
            data-testid="button-open-community"
            onClick={() => setCommunityOpen(true)}
          >
            <Bell size={19} strokeWidth={1.8} />
          </button>
        </header>

        <section className="hero" aria-labelledby="welcome-title">
          <div className="orb" aria-hidden="true">
            <Sparkles size={38} strokeWidth={1.25} />
          </div>
          <div className="eyebrow">Your study launchpad</div>
          <h1 id="welcome-title">Welcome to <span>Study Desk</span></h1>
          <p><strong>Good resources should feel close.</strong><br />Pick a room and get back to the work that matters.</p>
        </section>

        <section aria-labelledby="rooms-title">
          <div className="section-title">
            <h2 id="rooms-title">Learning rooms</h2>
            <span>{resources.length.toString().padStart(2, '0')} trusted spaces</span>
          </div>
          <div className="resource-grid" data-testid="grid-learning-rooms">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <button
                  className="resource-card"
                  key={resource.id}
                  data-testid={`card-resource-${resource.id}`}
                  onClick={() => selectResource(resource)}
                >
                  <span className="resource-icon" aria-hidden="true">
                    <span className="initials">{resource.initials}</span>
                    <Icon className="resource-glyph" size={15} strokeWidth={1.8} />
                  </span>
                  <span className="resource-name">{resource.name}</span>
                  <span className="resource-meta">{resource.category}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="status-card" aria-label="Access key status" data-testid="status-access-key">
          <span className="status-badge" aria-hidden="true"><ShieldAlert size={18} /></span>
          <span className="status-copy">
            <b>NO ACCESS</b>
            <span>No access key connected</span>
          </span>
          <button
            className="key-button"
            data-testid="button-get-access-key"
            onClick={() => setToast('Access keys are coming soon.')}
          >
            <KeyRound size={13} /> Get key
          </button>
        </section>

        <p className="footer-note">A quiet place to begin · study desk / 01</p>
      </div>

      {drawerOpen && (
        <>
          <button className="backdrop" aria-label="Close navigation" data-testid="button-close-navigation-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="drawer" aria-label="Study Desk navigation" data-testid="navigation-drawer">
            <div className="drawer-head">
              <div className="brand-lockup">
                <span className="brand-mark"><PanelTop size={18} strokeWidth={1.8} /></span>
                <span className="brand-word">Study<em>Desk</em></span>
              </div>
              <button className="icon-button" aria-label="Close navigation" data-testid="button-close-navigation" onClick={() => setDrawerOpen(false)}>
                <X size={19} />
              </button>
            </div>
            <div className="drawer-body">
              <ul className="nav-list">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li className="nav-item" key={item.id}>
                      <button
                        className={`nav-link ${activeNav === item.id ? 'active' : ''}`}
                        data-testid={`button-nav-${item.id}`}
                        onClick={() => selectNav(item.id)}
                      >
                        <span className="nav-icon"><Icon size={17} strokeWidth={1.7} /></span>
                        <span>{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button className="nav-link" data-testid="button-nav-help" onClick={() => setToast('Study Desk is here whenever you need a fresh start.')}>
                <span className="nav-icon"><CircleHelp size={17} strokeWidth={1.7} /></span>
                <span>About the desk</span>
              </button>
            </div>
            <div className="drawer-foot">
              <div className="status-card" data-testid="status-drawer-access-key">
                <span className="status-badge" aria-hidden="true"><ShieldAlert size={17} /></span>
                <span className="status-copy"><b>NO ACCESS</b><span>No access key</span></span>
                <button className="key-button" data-testid="button-drawer-get-key" onClick={() => setToast('Access keys are coming soon.')}>Get key</button>
              </div>
            </div>
          </aside>
        </>
      )}

      {communityOpen && (
        <>
          <button className="backdrop" aria-label="Close community dialog" data-testid="button-close-community-backdrop" onClick={() => setCommunityOpen(false)} />
          <div className="modal-wrap">
            <section className="community-modal" role="dialog" aria-modal="true" aria-labelledby="community-title" data-testid="modal-community">
              <button className="modal-close" aria-label="Close community dialog" data-testid="button-close-community" onClick={() => setCommunityOpen(false)}>
                <X size={17} />
              </button>
              <div className="modal-symbol" aria-hidden="true"><Users size={34} strokeWidth={1.35} /></div>
              <h2 id="community-title">Join the desk community</h2>
              <p>Updates, useful finds, and a little momentum for the days when studying feels heavy.</p>
              <span className="member-pill"><i /> 18,406 learners</span>
              <button className="join-button" data-testid="button-join-community" onClick={() => { setCommunityOpen(false); setToast('Community link copied to your clipboard.'); }}>
                Join community <Send size={15} />
              </button>
            </section>
          </div>
        </>
      )}

      {toast && <div className="toast" role="status" data-testid="status-toast"><Check size={13} /> {toast}</div>}
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;