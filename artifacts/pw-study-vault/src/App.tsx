import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  GraduationCap,
  Library,
  LogOut,
  Megaphone,
  Menu,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  getListPwAnnouncementsQueryKey,
  getListPwBatchesQueryKey,
  getListPwDppQueryKey,
  getListPwNotesQueryKey,
  getListPwSubjectsQueryKey,
  getListPwTopicsQueryKey,
  setAuthTokenGetter,
  useExchangePwOtp,
  useListPwAnnouncements,
  useListPwBatches,
  useListPwDpp,
  useListPwNotes,
  useListPwSubjects,
  useListPwTopics,
  useRequestPwOtp,
  useVerifyPwToken,
  type PwAnnouncement,
  type PwAttachment,
  type PwResourceGroup,
} from '@workspace/api-client-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const SESSION_KEY = 'pw-study-vault-token';

setAuthTokenGetter(() => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_KEY);
});

const messageFromError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return fallback;
};

const isUnauthorized = (error: unknown) =>
  typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 401;

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const formatSchedule = (value?: string | null) => {
  if (!value) return 'Recently posted';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date);
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-study-vault">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-primary shadow-[4px_4px_0_hsl(42_91%_61%/0.25)]">
        <BookOpen className="h-5 w-5" strokeWidth={2.4} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-accent" />
      </div>
      {!compact && (
        <div>
          <p className="font-serif text-[17px] font-bold leading-none tracking-tight text-sidebar-foreground">study vault</p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-sidebar-foreground/50">PW companion</p>
        </div>
      )}
    </div>
  );
}

function Login({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [mode, setMode] = useState<'token' | 'otp'>('token');
  const [token, setToken] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState('');
  const requestOtp = useRequestPwOtp();
  const exchangeOtp = useExchangePwOtp();

  const submitToken = (event: FormEvent) => {
    event.preventDefault();
    if (token.trim()) onAuthenticated(token.trim());
  };

  const requestCode = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    requestOtp.mutate({ data: { countryCode: countryCode.trim(), phone: phone.trim() } }, {
      onSuccess: (result) => {
        if (result.success) setOtpRequested(true);
        else setMessage(result.errorMessage ?? 'We could not send a code. Please try again.');
      },
      onError: (error) => setMessage(messageFromError(error, 'We could not reach PW right now.')),
    });
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    exchangeOtp.mutate({ data: { phone: phone.trim(), otp: otp.trim() } }, {
      onSuccess: (result) => {
        if (result.success && result.accessToken) onAuthenticated(result.accessToken);
        else setMessage(result.errorMessage ?? 'That code was not accepted. Request a new one.');
      },
      onError: (error) => setMessage(messageFromError(error, 'We could not verify that code.')),
    });
  };

  return (
    <main className="grain vault-grid flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-8 text-foreground">
      <div className="pointer-events-none absolute left-[-12vw] top-[-16vw] h-[42vw] w-[42vw] rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-18vw] right-[-10vw] h-[38vw] w-[38vw] rounded-full bg-[#9fbbb1]/20 blur-3xl" />
      <div className="relative grid w-full max-w-[1040px] overflow-hidden rounded-[30px] border border-border/70 bg-card/90 shadow-[0_24px_70px_hsl(225_27%_18%/0.13)] backdrop-blur-md md:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden min-h-[610px] overflow-hidden bg-primary p-10 text-sidebar-foreground md:flex md:flex-col md:justify-between">
          <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full border-[34px] border-accent/20" />
          <div className="absolute bottom-20 right-10 h-20 w-20 rounded-full border border-sidebar-foreground/10" />
          <BrandMark />
          <div className="relative max-w-sm">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-accent">a quieter way to study</p>
            <h1 className="font-serif text-5xl font-bold leading-[1.03] tracking-[-0.04em]">Everything you need, in the right place.</h1>
            <p className="mt-6 max-w-xs text-sm leading-6 text-sidebar-foreground/65">Your enrolled batches, notes, DPPs and important updates — kept close so your focus stays on the next concept.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-sidebar-foreground/10 pt-5 text-xs text-sidebar-foreground/50">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Your session stays on this device only.</span>
          </div>
        </section>
        <section className="flex min-h-[610px] flex-col justify-center p-6 sm:p-12">
          <div className="mb-10 md:hidden"><BrandMark compact /></div>
          <div className="mb-9">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">welcome back</p>
            <h2 className="font-serif text-3xl font-bold tracking-[-0.03em]">Open your study desk.</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Sign in with the PW access you already use. Nothing new to remember.</p>
          </div>
          <div className="mb-7 flex border-b border-border">
            <button type="button" data-testid="button-login-token" onClick={() => { setMode('token'); setMessage(''); }} className={`relative mr-6 pb-3 text-sm font-semibold transition-colors ${mode === 'token' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Access token
              {mode === 'token' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent" />}
            </button>
            <button type="button" data-testid="button-login-otp" onClick={() => { setMode('otp'); setMessage(''); }} className={`relative pb-3 text-sm font-semibold transition-colors ${mode === 'otp' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              Phone code
              {mode === 'otp' && <span className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-accent" />}
            </button>
          </div>
          {mode === 'token' ? (
            <form className="space-y-5" onSubmit={submitToken}>
              <label className="block" htmlFor="pw-access-token">
                <span className="mb-2 block text-xs font-semibold text-foreground">PW access token</span>
                <Input id="pw-access-token" data-testid="input-access-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste your token here" type="password" autoComplete="off" className="h-12 rounded-xl bg-background px-4" />
              </label>
              <Button type="submit" data-testid="button-continue-token" disabled={!token.trim()} className="h-12 w-full rounded-xl bg-primary text-sm font-bold shadow-[0_8px_18px_hsl(225_27%_18%/0.16)] transition-transform hover:-translate-y-0.5">
                Continue to vault <ArrowUpRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={otpRequested ? verifyCode : requestCode}>
              <label className="block" htmlFor="phone-number">
                <span className="mb-2 block text-xs font-semibold text-foreground">Phone number</span>
                <div className="flex gap-2">
                  <Input aria-label="Country code" data-testid="input-country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="h-12 w-[76px] rounded-xl bg-background px-3 text-center" />
                  <div className="relative flex-1">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone-number" data-testid="input-phone-number" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Your PW-registered number" type="tel" className="h-12 rounded-xl bg-background pl-10" />
                  </div>
                </div>
              </label>
              {otpRequested && (
                <label className="block animate-fade" htmlFor="phone-otp">
                  <span className="mb-2 flex items-center justify-between text-xs font-semibold text-foreground"><span>One-time code</span><button type="button" data-testid="button-change-phone" onClick={() => setOtpRequested(false)} className="font-medium text-muted-foreground underline underline-offset-4">Change number</button></span>
                  <Input id="phone-otp" data-testid="input-phone-otp" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter the code from PW" inputMode="numeric" className="h-12 rounded-xl bg-background tracking-[0.35em]" />
                </label>
              )}
              {message && <p role="alert" data-testid="status-login-error" className="flex items-start gap-2 text-xs leading-5 text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
              <Button type="submit" data-testid="button-submit-otp" disabled={!phone.trim() || (otpRequested && !otp.trim()) || requestOtp.isPending || exchangeOtp.isPending} className="h-12 w-full rounded-xl bg-primary text-sm font-bold shadow-[0_8px_18px_hsl(225_27%_18%/0.16)] transition-transform hover:-translate-y-0.5">
                {requestOtp.isPending || exchangeOtp.isPending ? 'Checking with PW…' : otpRequested ? <>Enter the vault <ArrowUpRight className="h-4 w-4" /></> : <>Send me a code <ArrowUpRight className="h-4 w-4" /></>}
              </Button>
            </form>
          )}
          <p className="mt-8 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" /> We use your details only to connect to your PW account.</p>
        </section>
      </div>
    </main>
  );
}

function LoadingDesk() {
  return (
    <div className="min-h-[100dvh] bg-background p-5 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-8">
        <Skeleton className="h-14 w-full rounded-2xl bg-muted" />
        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          <Skeleton className="h-[220px] rounded-3xl bg-muted" />
          <Skeleton className="h-[220px] rounded-3xl bg-muted" />
        </div>
        <Skeleton className="h-[340px] rounded-3xl bg-muted" />
      </div>
    </div>
  );
}

function ExpiredSession({ onReset }: { onReset: () => void }) {
  return (
    <main className="grain flex min-h-[100dvh] items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-card p-8 text-center shadow-[0_20px_50px_hsl(225_27%_18%/0.1)]">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/30 text-primary"><Clock3 className="h-6 w-6" /></div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">session ended</p>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Let’s pick up where you left off.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Your PW session has expired or is no longer valid. Sign in again to reopen your enrolled study desk.</p>
        <Button onClick={onReset} data-testid="button-sign-in-again" className="mt-7 h-11 w-full rounded-xl font-bold">Sign in again <ArrowUpRight className="h-4 w-4" /></Button>
      </div>
    </main>
  );
}

function Attachment({ attachment }: { attachment: PwAttachment }) {
  const open = () => window.open(attachment.url, '_blank', 'noopener,noreferrer');
  const download = () => {
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = attachment.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };
  return (
    <div className="group flex items-center justify-between gap-4 border-t border-border/70 py-3.5 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/25 text-primary transition-colors group-hover:bg-accent"><FileText className="h-4 w-4" /></div>
        <span data-testid={`text-attachment-${attachment.id ?? attachment.name}`} className="truncate text-sm font-medium text-foreground">{attachment.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button type="button" data-testid={`button-open-attachment-${attachment.id ?? attachment.name}`} title="Open attachment" onClick={open} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"><ExternalLink className="h-4 w-4" /></button>
        <button type="button" data-testid={`button-download-attachment-${attachment.id ?? attachment.name}`} title="Download attachment" onClick={download} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"><Download className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ResourceList({ groups, loading, error, resourceLabel }: { groups: PwResourceGroup[]; loading: boolean; error?: unknown; resourceLabel: string }) {
  if (loading) return <div className="space-y-4"><Skeleton className="h-24 rounded-2xl bg-muted" /><Skeleton className="h-24 rounded-2xl bg-muted" /><Skeleton className="h-24 rounded-2xl bg-muted" /></div>;
  if (error) return <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive"><CircleAlert className="h-5 w-5 shrink-0" />Could not load {resourceLabel.toLowerCase()} right now. Refresh and try again.</div>;
  if (!groups.length) return <div className="rounded-2xl border border-dashed border-border bg-background/50 px-6 py-12 text-center"><FolderOpen className="mx-auto mb-3 h-7 w-7 text-muted-foreground/50" /><p className="font-semibold">No {resourceLabel.toLowerCase()} here yet</p><p className="mt-1 text-sm text-muted-foreground">New material will appear as PW publishes it.</p></div>;
  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <article key={`${group.topic ?? 'general'}-${index}`} data-testid={`card-resource-group-${index}`} className="rounded-2xl border border-border bg-card px-5 py-2 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 py-4">
            <div className="flex items-center gap-2.5"><div className="h-1.5 w-1.5 rounded-full bg-accent" /><h3 className="font-serif text-lg font-bold">{group.topic || 'Study material'}</h3></div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{group.attachments.length} file{group.attachments.length === 1 ? '' : 's'}</span>
          </div>
          {group.attachments.map((attachment, attachmentIndex) => <Attachment key={attachment.id ?? `${attachment.name}-${attachmentIndex}`} attachment={attachment} />)}
        </article>
      ))}
    </div>
  );
}

function AnnouncementCard({ item }: { item: PwAnnouncement }) {
  return (
    <article data-testid={`card-announcement-${item.id ?? item.announcement.slice(0, 12)}`} className="relative rounded-2xl border border-border bg-card p-5 shadow-xs transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d8e8df] text-[#31675d]"><Megaphone className="h-4 w-4" /></div>
        <span className="font-mono text-[10px] text-muted-foreground">{formatSchedule(item.scheduleTime)}</span>
      </div>
      <p data-testid={`text-announcement-${item.id ?? item.announcement.slice(0, 12)}`} className="mt-4 text-sm leading-6 text-foreground/85">{item.announcement}</p>
      {item.attachment && <button type="button" data-testid={`button-open-announcement-${item.id ?? item.announcement.slice(0, 12)}`} onClick={() => window.open(item.attachment?.url, '_blank', 'noopener,noreferrer')} className="mt-4 flex items-center gap-2 text-xs font-bold text-primary underline-offset-4 hover:underline"><Paperclip className="h-3.5 w-3.5" />{item.attachment.name}<ExternalLink className="h-3 w-3" /></button>}
    </article>
  );
}

function StudyDashboard({ onLogout, onSessionExpired }: { onLogout: () => void; onSessionExpired: () => void }) {
  const client = useQueryClient();
  const [selectedBatchSlug, setSelectedBatchSlug] = useState('');
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState('');
  const [selectedTopicSlug, setSelectedTopicSlug] = useState('');
  const [resourceType, setResourceType] = useState<'notes' | 'dpp'>('notes');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const batchesQuery = useListPwBatches({ query: { queryKey: getListPwBatchesQueryKey(), staleTime: 60_000 } });
  const batches = batchesQuery.data ?? [];
  const activeBatch = useMemo(() => batches.find((batch) => batch.slug === selectedBatchSlug) ?? batches[0], [batches, selectedBatchSlug]);
  const subjectsQuery = useListPwSubjects(activeBatch?.slug ?? '', { query: { queryKey: getListPwSubjectsQueryKey(activeBatch?.slug ?? ''), enabled: Boolean(activeBatch?.slug), staleTime: 60_000 } });
  const subjects = subjectsQuery.data ?? [];
  const activeSubject = useMemo(() => subjects.find((subject) => subject.slug === selectedSubjectSlug) ?? subjects[0], [subjects, selectedSubjectSlug]);
  const topicsQuery = useListPwTopics(activeBatch?.slug ?? '', activeSubject?.slug ?? '', { query: { queryKey: getListPwTopicsQueryKey(activeBatch?.slug ?? '', activeSubject?.slug ?? ''), enabled: Boolean(activeBatch?.slug && activeSubject?.slug), staleTime: 60_000 } });
  const topics = topicsQuery.data ?? [];
  const activeTopic = useMemo(() => topics.find((topic) => topic.slug === selectedTopicSlug) ?? topics[0], [topics, selectedTopicSlug]);
  const notesQuery = useListPwNotes(activeBatch?.slug ?? '', activeSubject?.slug ?? '', activeTopic?.slug ?? '', { query: { queryKey: getListPwNotesQueryKey(activeBatch?.slug ?? '', activeSubject?.slug ?? '', activeTopic?.slug ?? ''), enabled: Boolean(activeBatch?.slug && activeSubject?.slug && activeTopic?.slug) } });
  const dppQuery = useListPwDpp(activeBatch?.slug ?? '', activeSubject?.slug ?? '', activeTopic?.slug ?? '', { query: { queryKey: getListPwDppQueryKey(activeBatch?.slug ?? '', activeSubject?.slug ?? '', activeTopic?.slug ?? ''), enabled: Boolean(activeBatch?.slug && activeSubject?.slug && activeTopic?.slug) } });
  const announcementQuery = useListPwAnnouncements(activeBatch?.id ?? '', { query: { queryKey: getListPwAnnouncementsQueryKey(activeBatch?.id ?? ''), enabled: Boolean(activeBatch?.id), staleTime: 60_000 } });

  useEffect(() => {
    if (batches.length && !batches.some((batch) => batch.slug === selectedBatchSlug)) setSelectedBatchSlug(batches[0].slug);
  }, [batches, selectedBatchSlug]);
  useEffect(() => {
    if (subjects.length && !subjects.some((subject) => subject.slug === selectedSubjectSlug)) setSelectedSubjectSlug(subjects[0].slug);
  }, [subjects, selectedSubjectSlug]);
  useEffect(() => {
    if (topics.length && !topics.some((topic) => topic.slug === selectedTopicSlug)) setSelectedTopicSlug(topics[0].slug);
  }, [topics, selectedTopicSlug]);
  useEffect(() => {
    if (isUnauthorized(batchesQuery.error)) onSessionExpired();
  }, [batchesQuery.error, onSessionExpired]);

  const refresh = () => {
    void client.invalidateQueries();
  };
  const currentGroups = resourceType === 'notes' ? notesQuery.data ?? [] : dppQuery.data ?? [];
  const currentLoading = resourceType === 'notes' ? notesQuery.isPending : dppQuery.isPending;
  const currentError = resourceType === 'notes' ? notesQuery.error : dppQuery.error;
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return currentGroups;
    return currentGroups
      .map((group) => ({ ...group, attachments: group.attachments.filter((attachment) => `${group.topic ?? ''} ${attachment.name}`.toLowerCase().includes(query)) }))
      .filter((group) => group.topic?.toLowerCase().includes(query) || group.attachments.length > 0);
  }, [currentGroups, search]);

  if (batchesQuery.isPending) return <LoadingDesk />;
  if (batchesQuery.error) return <ErrorDesk onRetry={refresh} message={messageFromError(batchesQuery.error, 'Your batches could not be loaded.')} />;
  if (!batches.length) return <EmptyDesk onLogout={onLogout} />;

  return (
    <div className="grain min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col bg-primary px-5 py-6 text-sidebar-foreground shadow-xl transition-transform duration-300 md:translate-x-0 ${mobileMenu ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between"><BrandMark /><button type="button" data-testid="button-close-menu" onClick={() => setMobileMenu(false)} className="rounded-lg p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"><X className="h-5 w-5" /></button></div>
        <div className="mt-12">
          <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">your desk</p>
          <div className="rounded-2xl bg-sidebar-accent/80 p-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary"><Library className="h-4 w-4" /></div><div className="min-w-0"><p className="truncate text-sm font-bold">Study library</p><p className="mt-0.5 text-[11px] text-sidebar-foreground/50">Enrolled material</p></div><Check className="ml-auto h-4 w-4 text-accent" /></div></div>
        </div>
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-sidebar-foreground/10 p-4"><div className="flex items-center gap-2 text-accent"><Sparkles className="h-4 w-4" /><span className="font-mono text-[10px] uppercase tracking-[0.18em]">stay steady</span></div><p className="mt-3 text-xs leading-5 text-sidebar-foreground/60">Small, consistent sessions add up. Start with one topic today.</p></div>
          <button type="button" data-testid="button-logout" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      </aside>
      {mobileMenu && <button type="button" aria-label="Close menu overlay" data-testid="button-menu-overlay" onClick={() => setMobileMenu(false)} className="fixed inset-0 z-30 bg-primary/40 md:hidden" />}
      <main className="min-h-[100dvh] md:pl-[268px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-5 py-4 backdrop-blur-md md:px-10">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
            <div className="flex items-center gap-3"><button type="button" data-testid="button-open-menu" onClick={() => setMobileMenu(true)} className="rounded-xl border border-border bg-card p-2.5 md:hidden"><Menu className="h-5 w-5" /></button><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">your study desk</p><h1 data-testid="text-dashboard-heading" className="mt-1 font-serif text-xl font-bold tracking-tight sm:text-2xl">Good to have you back.</h1></div></div>
            <div className="flex items-center gap-2"><button type="button" data-testid="button-refresh" onClick={refresh} className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-accent hover:text-primary"><RefreshCw className={`h-4 w-4 ${batchesQuery.isFetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span></button><div className="hidden h-10 items-center gap-2 rounded-xl bg-card px-3 text-xs font-semibold shadow-xs sm:flex"><div className="h-2 w-2 rounded-full bg-[#579d7f]" />Session active</div></div>
          </div>
        </header>
        <div className="mx-auto max-w-[1180px] space-y-8 px-5 py-7 md:px-10 md:py-10">
          <section className="animate-rise grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <div className="relative overflow-hidden rounded-[26px] bg-primary p-7 text-sidebar-foreground shadow-[0_16px_32px_hsl(225_27%_18%/0.14)] sm:p-9">
              <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-accent/20" /><div className="absolute bottom-[-52px] right-24 h-36 w-36 rounded-full border border-sidebar-foreground/10" />
              <div className="relative"><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">currently enrolled</p><h2 data-testid="text-active-batch" className="mt-4 max-w-lg font-serif text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">{activeBatch?.name}</h2><p className="mt-3 max-w-md text-sm leading-6 text-sidebar-foreground/60">Pick a subject, open a topic, and keep your momentum moving.</p>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sidebar-foreground/60">{activeBatch?.startDate && <span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-accent" />Started {formatDate(activeBatch.startDate)}</span>}{activeBatch?.expiryDate && <span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-accent" />Access until {formatDate(activeBatch.expiryDate)}</span>}</div>
              </div>
            </div>
            <div className="rounded-[26px] border border-border bg-card p-6 shadow-xs"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/25 text-primary"><GraduationCap className="h-4 w-4" /></div><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">batch switcher</span></div><ChevronDown className="h-4 w-4 text-muted-foreground" /></div><label className="sr-only" htmlFor="batch-select">Choose a batch</label><select id="batch-select" data-testid="select-batch" value={activeBatch?.slug ?? ''} onChange={(event) => { setSelectedBatchSlug(event.target.value); setSelectedSubjectSlug(''); setSelectedTopicSlug(''); }} className="h-12 w-full appearance-none rounded-xl border border-input bg-background px-4 text-sm font-bold outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20">{batches.map((batch) => <option key={batch.slug} value={batch.slug}>{batch.name}</option>)}</select><p className="mt-4 text-xs leading-5 text-muted-foreground">{batches.length} enrolled batch{batches.length === 1 ? '' : 'es'} available in your account.</p></div>
          </section>
          <section className="animate-rise-delay grid gap-6 xl:grid-cols-[1fr_330px]">
            <div className="min-w-0">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">browse material</p><h2 className="mt-2 font-serif text-2xl font-bold tracking-tight">Find your next lesson.</h2></div><div className="relative w-full sm:w-56"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input data-testid="input-search-material" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search in this view" className="h-10 rounded-xl border-border bg-card pl-9 text-xs" /></div></div>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{subjectsQuery.isPending ? <><Skeleton className="h-10 w-28 rounded-xl bg-muted" /><Skeleton className="h-10 w-28 rounded-xl bg-muted" /></> : subjects.map((subject) => <button type="button" key={subject.slug} data-testid={`button-subject-${subject.slug}`} onClick={() => { setSelectedSubjectSlug(subject.slug); setSelectedTopicSlug(''); }} className={`shrink-0 rounded-xl border px-4 py-2.5 text-left transition-all ${activeSubject?.slug === subject.slug ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary'}`}><span className="block text-sm font-bold">{subject.name}</span><span className={`mt-0.5 block font-mono text-[9px] uppercase tracking-[0.1em] ${activeSubject?.slug === subject.slug ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>{subject.lectureCount ?? 0} lectures</span></button>)}</div>
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-xs sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-muted-foreground">Topics in <span className="text-foreground">{activeSubject?.name ?? 'this subject'}</span></p><div className="mt-3 flex gap-2 overflow-x-auto">{topicsQuery.isPending ? <Skeleton className="h-8 w-24 rounded-lg bg-muted" /> : topics.length ? topics.map((topic) => <button type="button" key={topic.slug} data-testid={`button-topic-${topic.slug}`} onClick={() => setSelectedTopicSlug(topic.slug)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${activeTopic?.slug === topic.slug ? 'bg-accent text-primary' : 'bg-secondary text-muted-foreground hover:bg-accent/40 hover:text-primary'}`}>{topic.name}</button>) : <span className="text-xs text-muted-foreground">Topics will appear here once this subject is synced.</span>}</div></div><div className="flex shrink-0 rounded-xl bg-secondary p-1"><button type="button" data-testid="button-resource-notes" onClick={() => setResourceType('notes')} className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${resourceType === 'notes' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground'}`}>Notes</button><button type="button" data-testid="button-resource-dpp" onClick={() => setResourceType('dpp')} className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${resourceType === 'dpp' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground'}`}>DPPs</button></div></div><ResourceList groups={filteredGroups} loading={currentLoading} error={currentError} resourceLabel={resourceType === 'notes' ? 'Notes' : 'DPPs'} /></div>
            </div>
            <aside className="space-y-5">
              <div className="rounded-[24px] border border-border bg-card p-5 shadow-xs"><div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">latest notes</p><h2 className="mt-1 font-serif text-xl font-bold">From PW</h2></div><Megaphone className="h-4 w-4 text-accent-foreground" /></div>{announcementQuery.isPending ? <div className="space-y-3"><Skeleton className="h-24 rounded-xl bg-muted" /><Skeleton className="h-24 rounded-xl bg-muted" /></div> : announcementQuery.error ? <p className="text-xs leading-5 text-muted-foreground">Announcements are taking a moment to load.</p> : announcementQuery.data?.length ? <div className="space-y-3">{announcementQuery.data.slice(0, 3).map((item) => <AnnouncementCard key={item.id ?? item.announcement} item={item} />)}</div> : <div className="rounded-xl bg-background p-4 text-center"><p className="text-xs font-semibold">No new announcements</p><p className="mt-1 text-[11px] text-muted-foreground">You are all caught up.</p></div>}</div>
              <div className="rounded-[24px] bg-[#d8e8df] p-5 text-[#244f48]"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#31675d]">study rhythm</p><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c1dbd0]"><Clock3 className="h-4 w-4" /></div></div><p className="mt-5 font-serif text-xl font-bold leading-tight">Keep the desk open. Let consistency do the heavy lifting.</p></div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function ErrorDesk({ onRetry, message }: { onRetry: () => void; message: string }) {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5"><div className="w-full max-w-md rounded-[26px] border border-border bg-card p-8 text-center shadow-xs"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><CircleAlert className="h-5 w-5" /></div><h1 className="font-serif text-2xl font-bold">The desk is taking a moment.</h1><p data-testid="status-dashboard-error" className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p><Button onClick={onRetry} data-testid="button-retry-dashboard" className="mt-6 rounded-xl">Try again <RefreshCw className="h-4 w-4" /></Button></div></main>;
}

function EmptyDesk({ onLogout }: { onLogout: () => void }) {
  return <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5"><div className="w-full max-w-md rounded-[26px] border border-border bg-card p-8 text-center shadow-xs"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/30 text-primary"><Library className="h-5 w-5" /></div><h1 className="font-serif text-2xl font-bold">Your library is waiting.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">We could not find an enrolled batch for this PW account yet. Check your account and try again.</p><Button onClick={onLogout} data-testid="button-empty-logout" variant="outline" className="mt-6 rounded-xl">Sign out</Button></div></main>;
}

function Home() {
  const [token, setToken] = useState<string | null>(() => typeof window === 'undefined' ? null : window.sessionStorage.getItem(SESSION_KEY));
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>(() => token ? 'checking' : 'ready');
  const verify = useVerifyPwToken();
  useEffect(() => {
    if (!token) { setStatus('ready'); return; }
    setStatus('checking');
    verify.mutate({ data: { token } }, {
      onSuccess: (result) => {
        if (result.valid) setStatus('ready');
        else { window.sessionStorage.removeItem(SESSION_KEY); setStatus('expired'); }
      },
      onError: () => { window.sessionStorage.removeItem(SESSION_KEY); setStatus('expired'); },
    });
    // Verification should happen once per token loaded from this browser session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const authenticate = (nextToken: string) => {
    window.sessionStorage.setItem(SESSION_KEY, nextToken);
    setToken(nextToken);
  };
  const logout = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
    setStatus('ready');
    void queryClient.clear();
  };
  const expireSession = () => {
    window.sessionStorage.removeItem(SESSION_KEY);
    setToken(null);
    setStatus('expired');
  };
  if (status === 'checking') return <LoadingDesk />;
  if (status === 'expired') return <ExpiredSession onReset={() => { setStatus('ready'); setToken(null); }} />;
  if (status === 'ready' && !token) return <Login onAuthenticated={authenticate} />;
  return <StudyDashboard onLogout={logout} onSessionExpired={expireSession} />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
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
