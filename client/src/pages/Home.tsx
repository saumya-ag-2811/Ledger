import { useEffect, useRef, useState, FormEvent } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ExternalLink,
  Menu,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  checkAuth,
  loginWithGoogle,
  logoutUser,
  createNewSheet,
  addExpense,
  deleteExpense,
  fetchExpenses,
  fetchCategorySummary,
  fetchMonthlySummary,
  type User,
  type ExpenseItem,
} from "@/lib/api";

const symbols = [
  { mark: "$", left: "8%", top: "8%", size: "clamp(7rem, 18vw, 18rem)", delay: "0s" },
  { mark: "€", left: "25%", top: "2%", size: "clamp(8rem, 24vw, 24rem)", delay: "-1.2s" },
  { mark: "₹", left: "46%", top: "13%", size: "clamp(7rem, 19vw, 19rem)", delay: "-2.1s" },
  { mark: "£", left: "68%", top: "1%", size: "clamp(8rem, 22vw, 22rem)", delay: "-0.4s" },
  { mark: "¥", left: "84%", top: "18%", size: "clamp(6rem, 15vw, 15rem)", delay: "-2.8s" },
];

const CURRENCIES = [
  { symbol: "$", code: "USD", rate: 1.0, name: "US Dollar" },
  { symbol: "€", code: "EUR", rate: 0.92, name: "Euro" },
  { symbol: "₹", code: "INR", rate: 86.5, name: "Indian Rupee" },
  { symbol: "£", code: "GBP", rate: 0.79, name: "British Pound" },
  { symbol: "¥", code: "JPY", rate: 152.0, name: "Japanese Yen" },
];

const PRESET_CATEGORIES = [
  { name: "Food", icon: "🍔", color: "pink" },
  { name: "Travel", icon: "✈️", color: "green" },
  { name: "Rent", icon: "🏠", color: "cream" },
  { name: "Play", icon: "🎉", color: "orange" },
  { name: "Work", icon: "💼", color: "pink" },
  { name: "Utilities", icon: "⚡", color: "green" },
  { name: "Shopping", icon: "🛒", color: "orange" },
  { name: "Other", icon: "✦", color: "cream" },
];

const defaultCategoryBases = [
  { name: "Food", baseUsd: 482.30, note: "08 transactions", color: "pink", icon: "◒" },
  { name: "Travel", baseUsd: 216.80, note: "04 transactions", color: "green", icon: "↗" },
  { name: "Rent", baseUsd: 1840.00, note: "01 transaction", color: "cream", icon: "⌂" },
  { name: "Play", baseUsd: 98.40, note: "06 transactions", color: "orange", icon: "✦" },
];

const DEMO_CATEGORY_DETAILS: Record<string, Array<{ description: string; amountUsd: number; date: string }>> = {
  Food: [
    { description: "Weekly Farmers Market fresh groceries", amountUsd: 142.50, date: "2026-03-05" },
    { description: "Bistro dinner & drinks with team", amountUsd: 94.20, date: "2026-03-03" },
    { description: "Midweek organic supermarket restock", amountUsd: 62.80, date: "2026-03-01" },
    { description: "Specialty bakery & morning espresso", amountUsd: 18.40, date: "2026-02-28" },
    { description: "Healthy lunch bowl & fresh juice", amountUsd: 21.00, date: "2026-02-26" },
    { description: "Late night ramen bar with friends", amountUsd: 26.50, date: "2026-02-25" },
    { description: "Artisan sourdough bakery loaves", amountUsd: 14.40, date: "2026-02-24" },
    { description: "Morning oat matcha latte", amountUsd: 7.50, date: "2026-02-23" },
  ],
  Travel: [
    { description: "High-speed rail roundtrip express ticket", amountUsd: 128.00, date: "2026-03-04" },
    { description: "Airport rideshare cab", amountUsd: 42.30, date: "2026-03-01" },
    { description: "Monthly city transit card reload", amountUsd: 35.00, date: "2026-02-28" },
    { description: "City bikeshare pass membership", amountUsd: 11.50, date: "2026-02-25" },
  ],
  Rent: [
    { description: "Monthly studio apartment loft lease", amountUsd: 1840.00, date: "2026-03-01" },
  ],
  Play: [
    { description: "Indie live concert tickets (x2)", amountUsd: 48.00, date: "2026-03-03" },
    { description: "Vinyl record shop discovery album", amountUsd: 28.40, date: "2026-03-01" },
    { description: "Creative digital tools subscription", amountUsd: 14.99, date: "2026-02-28" },
    { description: "Board game café evening gathering", amountUsd: 7.01, date: "2026-02-25" },
  ],
};

const features = [
  { eyebrow: "01 / capture", title: "Add expenses", front: "The 10-second habit.", back: "Drop in a receipt, a note, or just a number. Ledger keeps the rest tidy.", stat: "10 sec avg." },
  { eyebrow: "02 / see patterns", title: "Track by category", front: "Watch the shape of your spend.", back: "Simple buckets make the noisy bits legible. No shame spirals, just signal.", stat: "12 buckets" },
  { eyebrow: "03 / zoom out", title: "Monthly view", front: "A month, in one glance.", back: "Compare your real life month over month, without an accounting degree.", stat: "−14% / mo" },
  { eyebrow: "04 / move freely", title: "Multi-currency", front: "Money has no one shape.", back: "Track dollars, euros, rupees, pounds, yen — in the same calm place.", stat: "$ € ₹ £ ¥" },
];

const testimonials = [
  { quote: "It feels less like budgeting and more like finally seeing the room you’re standing in.", name: "Mina, independent designer", number: "01 / 03" },
  { quote: "The first expense tracker I’ve kept open longer than a week. The numbers don’t judge me.", name: "Jon, producer", number: "02 / 03" },
  { quote: "I stopped asking where my money went. Ledger made it obvious — and oddly beautiful.", name: "Ari, product lead", number: "03 / 03" },
];

interface MiniLedgerProps {
  monthlyTotal: string;
  currencySymbol: string;
  expenses: ExpenseItem[];
  formatAmount: (usd: number) => string;
  onAddClick: () => void;
  isLoggedIn: boolean;
}

function MiniLedger({ monthlyTotal, currencySymbol, expenses, formatAmount, onAddClick, isLoggedIn }: MiniLedgerProps) {
  const dotColors = ["pink", "green", "orange"];

  return (
    <div className="mini-ledger" aria-label="Live expense list illustration">
      <div className="mini-ledger__head">
        <span>{isLoggedIn ? "THIS MONTH" : "THIS MONTH (DEMO)"}</span>
        <b>{monthlyTotal}</b>
      </div>

      {isLoggedIn ? (
        expenses.length > 0 ? (
          expenses.slice(0, 3).map((exp, idx) => (
            <div className="mini-line" key={exp.rowId || idx}>
              <span className={`mini-dot mini-dot--${dotColors[idx % dotColors.length]}`} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "10rem" }}>
                {exp.description}
              </span>
              <strong>−{formatAmount(exp.amount)}</strong>
            </div>
          ))
        ) : (
          <div style={{ padding: "1.4rem 0.5rem", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.68rem", color: "var(--pink)", fontWeight: 500 }}>
              No expenses recorded yet
            </p>
            <span style={{ fontSize: "0.58rem", opacity: 0.65, display: "block" }}>
              Click below to add your first expense
            </span>
          </div>
        )
      ) : (
        <>
          <div className="mini-line">
            <span className="mini-dot mini-dot--pink" /> <span>Late lunch</span>
            <strong>−{currencySymbol}24.80</strong>
          </div>
          <div className="mini-line">
            <span className="mini-dot mini-dot--green" /> <span>Train ticket</span>
            <strong>−{currencySymbol}48.00</strong>
          </div>
          <div className="mini-line">
            <span className="mini-dot mini-dot--orange" /> <span>Studio rent</span>
            <strong>−{currencySymbol}920.00</strong>
          </div>
        </>
      )}

      {/* Interactive Add Button */}
      <button
        type="button"
        className="mini-add"
        onClick={onAddClick}
        style={{
          cursor: "pointer",
          background: "transparent",
          border: "1px dashed rgba(10,10,10,0.35)",
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.55rem 0.65rem",
          borderRadius: "4px",
          color: "var(--ink)",
          font: "0.65rem var(--mono)",
          transition: "all 0.2s ease",
          marginTop: "0.5rem",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--orange)";
          e.currentTarget.style.color = "var(--orange)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(10,10,10,0.35)";
          e.currentTarget.style.color = "var(--ink)";
        }}
        title="Click to add a new expense"
      >
        <Plus size={14} /> {isLoggedIn ? "+ Add an expense" : "+ Add an expense (connect Google)"}
      </button>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const horizontalRef = useRef<HTMLElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const cursorRing = useRef<HTMLDivElement>(null);
  const cursorDot = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [testimonial, setTestimonial] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [wipe, setWipe] = useState(false);

  // Multi-Currency state
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const currentCurrency = CURRENCIES[currencyIndex];

  // Backend Integration State
  const [user, setUser] = useState<User | null>(null);
  const [userExpenses, setUserExpenses] = useState<ExpenseItem[]>([]);
  const [hasRealExpenses, setHasRealExpenses] = useState(false);
  const [rawMonthlyTotalUsd, setRawMonthlyTotalUsd] = useState<number>(0);
  const [categoryList, setCategoryList] = useState(defaultCategoryBases);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Category Detail Modal State
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    baseUsd: number;
    note: string;
    color: string;
    icon: string;
  } | null>(null);

  // Modal tab: 'form' | 'history'
  const [modalTab, setModalTab] = useState<"form" | "history">("form");

  // Expense form state
  const [formState, setFormState] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Food",
    description: "",
    amount: "",
  });

  // Convert USD amounts based on active currency
  const formatAmount = (usdValue: number) => {
    const converted = usdValue * currentCurrency.rate;
    if (currentCurrency.symbol === "¥") {
      return `${currentCurrency.symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${currentCurrency.symbol}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const monthlyTotalFormatted = formatAmount(rawMonthlyTotalUsd);

  // Check auth and fetch data on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("auth_success")) {
      setShowPanel(true);
      toast.success("Signed in with Google successfully!");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get("auth_error")) {
      const err = urlParams.get("auth_error") || "Authentication failed";
      setFeedback(`Sign in note: ${err}`);
      setShowPanel(true);
      toast.error(`Sign in error: ${err}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    refreshUserData();
  }, []);

  const refreshUserData = async () => {
    try {
      const auth = await checkAuth();
      if (auth.authenticated && auth.user) {
        setUser(auth.user);
        await Promise.all([loadSummaries(), loadExpenses()]);
      } else {
        setUser(null);
        setUserExpenses([]);
        setHasRealExpenses(false);
        setRawMonthlyTotalUsd(0);
      }
    } catch {
      setUser(null);
      setRawMonthlyTotalUsd(0);
    }
  };

  const loadExpenses = async () => {
    try {
      const exps = await fetchExpenses();
      setUserExpenses(exps);
      setHasRealExpenses(exps.length > 0);
    } catch {
      setUserExpenses([]);
      setHasRealExpenses(false);
    }
  };

  const loadSummaries = async () => {
    try {
      const [catSummary, monthSummary] = await Promise.all([
        fetchCategorySummary(),
        fetchMonthlySummary(),
      ]);

      if (monthSummary?.currentMonth) {
        setRawMonthlyTotalUsd(monthSummary.currentMonth.total || 0);
      } else {
        setRawMonthlyTotalUsd(0);
      }

      const colors = ["pink", "green", "cream", "orange"];
      const icons = ["◒", "↗", "⌂", "✦"];

      if (catSummary?.categories && catSummary.categories.length > 0) {
        const mapped = catSummary.categories.slice(0, 4).map((c, i) => ({
          name: c.category,
          baseUsd: c.total,
          note: `${String(c.count).padStart(2, "0")} transactions`,
          color: colors[i % colors.length],
          icon: icons[i % icons.length],
        }));
        setCategoryList(mapped);
      } else {
        // Reset to 0 balance if no expenses logged yet
        setCategoryList([
          { name: "Food", baseUsd: 0, note: "00 transactions", color: "pink", icon: "◒" },
          { name: "Travel", baseUsd: 0, note: "00 transactions", color: "green", icon: "↗" },
          { name: "Rent", baseUsd: 0, note: "00 transactions", color: "cream", icon: "⌂" },
          { name: "Play", baseUsd: 0, note: "00 transactions", color: "orange", icon: "✦" },
        ]);
      }
    } catch (e) {
      console.warn("Could not fetch expense summaries:", e);
    }
  };

  const handleCreateSheet = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await createNewSheet();
      setFeedback(`Sheet "${res.title}" created successfully!`);
      toast.success(`Google Sheet "${res.title}" created!`);
      await refreshUserData();
    } catch (err: any) {
      setFeedback(err.message || "Failed to create Google Sheet");
      toast.error(err.message || "Failed to create sheet");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!formState.description || !formState.amount) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      await addExpense({
        date: formState.date,
        category: formState.category,
        description: formState.description,
        amount: parseFloat(formState.amount),
      });
      setFeedback("Expense saved to your Google Sheet!");
      toast.success("Expense saved directly to Google Sheets!");
      setFormState({
        date: new Date().toISOString().split("T")[0],
        category: formState.category,
        description: "",
        amount: "",
      });
      await Promise.all([loadSummaries(), loadExpenses()]);
    } catch (err: any) {
      setFeedback(err.message || "Failed to add expense");
      toast.error(err.message || "Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (rowId: number) => {
    try {
      const ok = await deleteExpense(rowId);
      if (ok) {
        toast.success(`Expense at row ${rowId} removed`);
        await Promise.all([loadSummaries(), loadExpenses()]);
      } else {
        toast.error("Failed to delete expense");
      }
    } catch (err: any) {
      toast.error(err.message || "Delete error");
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setUserExpenses([]);
    setHasRealExpenses(false);
    setCategoryList(defaultCategoryBases);
    setRawMonthlyTotalUsd(2637.50);
    setFeedback(null);
    toast.info("Logged out successfully");
  };

  // Interactive Feature Actions
  const handleFeatureSymbolClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (index === 0) {
      toast.success("Opening Expense Tracker...", {
        description: "Log your expense in seconds directly to Sheets.",
      });
      launch();
    } else if (index === 1) {
      toast.info("Navigating to Category Breakdown...", {
        description: "Click any category card to inspect itemized spending & descriptions.",
      });
      const el = document.getElementById("categories");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        const cards = el.querySelectorAll(".category-card");
        cards.forEach((card) => {
          card.classList.add("element-target-pulse");
          setTimeout(() => card.classList.remove("element-target-pulse"), 2600);
        });
      }
    } else if (index === 2) {
      toast.info("Navigating to Monthly Overview...", {
        description: "Zooming into your real month-over-month ledger.",
      });
      const el = document.getElementById("why");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        const miniLedger = el.querySelector(".mini-ledger");
        if (miniLedger) {
          miniLedger.classList.add("element-target-pulse");
          setTimeout(() => miniLedger.classList.remove("element-target-pulse"), 2600);
        }
      }
    } else if (index === 3) {
      const nextIndex = (currencyIndex + 1) % CURRENCIES.length;
      setCurrencyIndex(nextIndex);
      const nextCurr = CURRENCIES[nextIndex];
      toast.success(`Currency switched to ${nextCurr.name} (${nextCurr.symbol})`, {
        description: `All figures now displayed in ${nextCurr.code}.`,
      });
    }
  };

  const launch = () => {
    setWipe(true);
    window.setTimeout(() => {
      setWipe(false);
      setShowPanel(true);
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }, 620);
  };

  useEffect(() => {
    const hero = heroRef.current;
    const horizontal = horizontalRef.current;
    if (!hero && !horizontal) return;
    let raf = 0;
    let lastY = window.scrollY;
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();
      const y = window.scrollY;
      const velocity = Math.min(3, Math.abs(y - lastY) / Math.max(16, now - lastTime) * 4);
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const max = Math.max(1, hero.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / max));
        hero.style.setProperty("--hero-progress", progress.toFixed(3));
        hero.style.setProperty("--hero-velocity", velocity.toFixed(2));
        hero.querySelectorAll<HTMLElement>(".currency-symbol").forEach((symbol, index) => {
          const starts = [-38, -55, -44, -62, -42];
          const ends = [8, 14, 13, 7, 11];
          const rotations = [-8, 6, -4, 9, -3];
          const y = starts[index] + (ends[index] - starts[index]) * progress;
          const rotation = rotations[index] + 180 * progress;
          symbol.style.transform = `translateY(${y}vh) rotate(${rotation}deg)`;
          symbol.style.opacity = `${Math.max(0.16, 1 - progress * 0.78)}`;
          symbol.style.filter = `drop-shadow(0 ${Math.max(3, 25 - progress * 18)}px ${Math.max(5, 15 - progress * 9)}px rgba(0,0,0,.3))`;
        });
      }
      if (horizontal) {
        const rect = horizontal.getBoundingClientRect();
        const max = Math.max(1, horizontal.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / max));
        horizontal.style.setProperty("--category-progress", progress.toFixed(3));
      }
      if (tickerRef.current) tickerRef.current.style.setProperty("--ticker-speed", `${Math.max(12, 30 - velocity * 6)}s`);
      lastY = y;
      lastTime = now;
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
          } else {
            entry.target.classList.remove("section-visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    document.querySelectorAll(".section-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const ring = cursorRing.current;
    const dot = cursorDot.current;
    if (!ring || !dot || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = -100, y = -100, rx = x, ry = y, raf = 0;
    const render = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(render);
    };
    const move = (e: MouseEvent) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    window.addEventListener("mousemove", move);
    raf = requestAnimationFrame(render);
    return () => { window.removeEventListener("mousemove", move); cancelAnimationFrame(raf); };
  }, []);

  return (
    <main className="ledger-page">
      <div ref={cursorDot} className="cursor-dot" aria-hidden="true" />
      <div ref={cursorRing} className="cursor-ring" aria-hidden="true" />
      <div className={`currency-wipe ${wipe ? "currency-wipe--active" : ""}`} aria-hidden="true"><span>$</span><span>₹</span><span>€</span></div>

      <header className="site-nav">
        <a className="wordmark" href="#top" aria-label="Ledger home"><span className="wordmark__mark">L</span> ledger<span className="wordmark__dot">.</span></a>
        <nav className={menuOpen ? "nav-links nav-links--open" : "nav-links"} aria-label="Primary navigation">
          <a href="#why" onClick={() => setMenuOpen(false)}>Why Ledger</a>
          <a href="#categories" onClick={() => setMenuOpen(false)}>Categories</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
        </nav>
        <button className="nav-cta" onClick={launch}>
          {user ? `Open Ledger (${user.name.split(" ")[0]})` : "Open Ledger"} <ArrowUpRight size={15} />
        </button>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </header>

      {/* Hero Section */}
      <section id="top" ref={heroRef} className="hero-section">
        <div className="hero-sticky">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-kicker"><span className="eyebrow-dot" /> A calmer way to look at money <span className="hero-kicker__year">EST. 2026</span></div>
          <div className="hero-copy">
            <p className="hero-overline">Your money, in motion.</p>
            <h1>Watch it<br /><em>move.</em></h1>
            <p className="hero-intro">Ledger is a quietly obsessive expense tracker for people who want to know where it all goes — synced directly into your Google Sheets.</p>
            <button className="text-link" onClick={launch}>Start tracking <ArrowRight size={17} /></button>
          </div>
          <div className="hero-annotation hero-annotation--left">SCROLL TO REVERSE <span>↓</span></div>
          <div className="hero-annotation hero-annotation--right">SPENDING <span className="annotation-line" /> SAVING</div>
          <div className="symbols-stage" aria-hidden="true">
            {symbols.map((symbol, index) => <span key={symbol.mark} className={`currency-symbol currency-symbol--${index}`} style={{ left: symbol.left, top: symbol.top, fontSize: symbol.size, animationDelay: symbol.delay }}>{symbol.mark}</span>)}
          </div>
          <div className="hinge-copy"><span>What goes down</span><strong>…you can watch<br />come back up.</strong></div>

          {/* Cleanly aligned Hero Bottom & Progress (Zero Overlap) */}
          <div className="hero-bottom">
            <span>EXPENSES, MADE VISIBLE</span>
            <ArrowDownRight size={17} />
            <div className="hero-progress">
              <span>00</span>
              <div><i /></div>
              <span className="hero-counter">01 / 05</span>
            </div>
          </div>
        </div>
      </section>

      {/* Connect / Why Section */}
      <section id="why" className="connect-section section-pad section-reveal">
        <div className="section-label"><span>01</span><span>THE CONNECTION</span><span>Ledger / in context</span></div>
        <div className="connect-layout">
          <div className="connect-headline"><h2>See where it<br /><span>connect</span>s.</h2><p>Most trackers make money feel like a problem to solve. Ledger makes it a pattern to notice.</p></div>
          <div className="letter-media" aria-label="Live expense entry illustration">
            <span className="letter-media__letter">o</span>
            <MiniLedger
              monthlyTotal={user ? monthlyTotalFormatted : formatAmount(2637.50)}
              currencySymbol={currentCurrency.symbol}
              expenses={userExpenses}
              formatAmount={formatAmount}
              onAddClick={launch}
              isLoggedIn={!!user}
            />
            <span className="letter-media__caption">A living view of your real transactions.</span>
          </div>
        </div>
        <div className="connect-foot">
          <span className="line-arrow">↳</span>
          <p>One tap to add. A little more clarity every single day.</p>
          {/* Authentic Real Metrics */}
          <div className="stat-pair">
            <strong>{user ? (userExpenses.length > 0 ? `${userExpenses.length} Rows` : "0 Rows") : "Demo Preview"}</strong>
            <span>{user ? "recorded live in Google Sheet" : "connect Google to start recording live"}</span>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" ref={horizontalRef} className="category-section">
        <div className="category-sticky">
          <div className="category-heading"><div><span className="section-index">02 / 05</span><h2>Every category<br /><em>has a rhythm.</em></h2></div><p>Scroll to sweep across your month.<br />Nothing hidden in the margins.</p></div>
          <div className="category-track">
            {categoryList.map((category, index) => (
              <article
                className={`category-card category-card--${category.color}`}
                key={category.name}
                onClick={() => setSelectedCategory(category)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedCategory(category);
                  }
                }}
                aria-label={`View spending details and itemized descriptions for ${category.name}`}
                title={`Click to inspect ${category.name} spending & descriptions`}
              >
                <div className="category-card__top">
                  <span>{category.icon}</span>
                  <span>0{index + 1}</span>
                </div>
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.note}</p>
                </div>
                <div className="category-card__amount">{formatAmount(category.baseUsd)}</div>
                <div className="category-card__bottom">
                  <span>view details</span>
                  <ChevronRight size={16} />
                </div>
              </article>
            ))}
            <div className="category-end"><Check size={26} /><span>That’s the<br />whole picture.</span></div>
          </div>
          <div className="category-scroll-note"><span>KEEP GOING</span><div className="scroll-line"><i /></div><span>04 / 04</span></div>
        </div>
      </section>

      {/* Marquee Ticker with Real Live Data */}
      <section className="marquee-section section-reveal" aria-label="Live category totals">
        <div className="marquee-label">
          <span className="live-dot" /> {user ? "LIVE METRICS" : "PREVIEW MODE"}
          <span>ACTIVE CURRENCY: {currentCurrency.code} ({currentCurrency.symbol})</span>
        </div>
        <div ref={tickerRef} className="marquee-track">
          <div className="marquee-row">
            {user ? (
              hasRealExpenses ? (
                <>
                  {categoryList.map((c) => (
                    <span key={c.name}>
                      {c.name.toUpperCase()} <b>{formatAmount(c.baseUsd)}</b>
                    </span>
                  ))}
                  <i>✳</i>
                  <span>THIS MONTH <b>{monthlyTotalFormatted}</b></span>
                  <i>✳</i>
                  <span>ENTRIES <b>{userExpenses.length}</b></span>
                  <i>✳</i>
                  <span>GOOGLE SHEETS BACKEND <b>LIVE</b></span>
                  <i>✳</i>
                  {categoryList.map((c) => (
                    <span key={`dup-${c.name}`}>
                      {c.name.toUpperCase()} <b>{formatAmount(c.baseUsd)}</b>
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span>GOOGLE SHEETS CONNECTED <b>SYNC READY</b></span>
                  <i>✳</i>
                  <span>THIS MONTH <b>{monthlyTotalFormatted}</b></span>
                  <i>✳</i>
                  <span>0 EXPENSES RECORDED <b>TAP + ADD AN EXPENSE</b></span>
                  <i>✳</i>
                  <span>100% STORED IN YOUR GOOGLE DRIVE <b>PRIVATE</b></span>
                  <i>✳</i>
                  <span>GOOGLE SHEETS CONNECTED <b>SYNC READY</b></span>
                  <i>✳</i>
                  <span>THIS MONTH <b>{monthlyTotalFormatted}</b></span>
                  <i>✳</i>
                </>
              )
            ) : (
              <>
                <span>SAMPLE PREVIEW <b>CONNECT GOOGLE FOR LIVE TOTALS</b></span>
                <i>✳</i>
                <span>FOOD <b>{formatAmount(482.30)}</b></span>
                <i>✳</i>
                <span>TRAVEL <b>{formatAmount(216.80)}</b></span>
                <i>✳</i>
                <span>RENT <b>{formatAmount(1840.00)}</b></span>
                <i>✳</i>
                <span>PLAY <b>{formatAmount(98.40)}</b></span>
                <i>✳</i>
                <span>MULTI-CURRENCY ENGINE <b>{currentCurrency.code} ({currentCurrency.symbol})</b></span>
                <i>✳</i>
                <span>ZERO EXTERNAL DATABASE <b>100% PRIVATE DRIVE</b></span>
                <i>✳</i>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section with Interactive Symbol Buttons */}
      <section id="features" className="features-section section-pad section-reveal">
        <div className="section-label"><span>03</span><span>THE TOOLKIT</span><span>Small moves, big picture</span></div>
        <div className="features-heading"><h2>A few good<br /><em>habits.</em></h2><p>Click any symbol to use that feature directly, or click the card to flip details.</p></div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <button
              key={feature.title}
              className={`feature-card ${activeCard === index ? "feature-card--flipped" : ""}`}
              onClick={() => setActiveCard(activeCard === index ? null : index)}
              aria-label={`${feature.title}. ${activeCard === index ? "Show front" : "Show details"}`}
            >
              <span className="feature-card__inner">
                <span className="feature-card__face feature-card__front">
                  <span className="feature-eyebrow">{feature.eyebrow}</span>

                  <span
                    className="feature-icon-action"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleFeatureSymbolClick(index, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleFeatureSymbolClick(index, e as any);
                      }
                    }}
                    title={`Click to ${index === 0 ? "add an expense" : index === 1 ? "track categories" : index === 2 ? "view monthly ledger" : "switch currency"}`}
                  >
                    {index === 0 ? (
                      <Plus size={24} />
                    ) : index === 1 ? (
                      <Sparkles size={23} />
                    ) : index === 2 ? (
                      <span style={{ font: "600 1.5rem var(--mono)" }}>↗</span>
                    ) : (
                      <span className="currency-badge-pop" style={{ font: "700 1.45rem var(--mono)", color: "var(--orange)" }}>
                        {currentCurrency.symbol}
                      </span>
                    )}
                  </span>

                  <span className="feature-action-label">
                    {index === 0 ? "✦ Click to Add" : index === 1 ? "↗ View Categories" : index === 2 ? "◎ View Month" : `⇄ Switch (${currentCurrency.code})`}
                  </span>

                  <strong>{feature.title}</strong>
                  <span className="feature-card__hint">{feature.front}</span>
                  <span className="feature-card__flip">
                    flip details <ArrowRight size={14} />
                  </span>
                </span>

                <span className="feature-card__face feature-card__back">
                  <span className="feature-eyebrow">{feature.eyebrow}</span>
                  <strong>{feature.title}</strong>
                  <p>{feature.back}</p>

                  <button
                    type="button"
                    className="panel-submit"
                    style={{
                      marginTop: "auto",
                      marginBottom: "1rem",
                      padding: "0.55rem 0.9rem",
                      fontSize: "0.6rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      width: "max-content",
                    }}
                    onClick={(e) => handleFeatureSymbolClick(index, e)}
                  >
                    {index === 0
                      ? "Open Add Expense"
                      : index === 1
                        ? "Jump to Categories"
                        : index === 2
                          ? "Jump to Monthly"
                          : `Switch to ${CURRENCIES[(currencyIndex + 1) % CURRENCIES.length].name}`}{" "}
                    <ArrowRight size={12} />
                  </button>

                  <span className="feature-stat">{feature.stat}</span>
                  <span className="feature-card__flip">
                    back <ArrowRight size={14} />
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Proof Section */}
      <section className="proof-section section-pad section-reveal">
        <div className="proof-blob proof-blob--one" /><div className="proof-blob proof-blob--two" />
        <div className="section-label"><span>04</span><span>THE FEELING</span><span>Notes from the other side</span></div>
        <div className="proof-content"><div className="proof-number">{testimonials[testimonial].number}</div><blockquote>“{testimonials[testimonial].quote}”</blockquote><div className="proof-meta"><span>{testimonials[testimonial].name}</span><div className="quote-controls"><button onClick={() => setTestimonial((testimonial + testimonials.length - 1) % testimonials.length)} aria-label="Previous quote">←</button><button onClick={() => setTestimonial((testimonial + 1) % testimonials.length)} aria-label="Next quote">→</button></div></div></div>
      </section>

      {/* CTA Section */}
      <section className="cta-section section-pad section-reveal">
        <div className="cta-inner"><div className="section-label"><span>05</span><span>THE NEXT MOVE</span><span>Made for the curious</span></div><h2>Make the invisible<br /><em>obvious.</em></h2><p>Start with one expense. Let the picture build.</p><button className="magnetic-button" onClick={launch}><span>Open your Ledger</span><ArrowUpRight size={18} /></button><div className="cta-note">NO CREDIT CARD <span>·</span> NO JUDGEMENT <span>·</span> JUST A CLEARER VIEW</div></div>
      </section>

      <footer className="site-footer"><a className="wordmark" href="#top"><span className="wordmark__mark">L</span> ledger<span className="wordmark__dot">.</span></a><div className="footer-links"><a href="#why">About</a><a href="#features">Features</a><a href="#top">Privacy</a></div><span>© 2026 LEDGER / MADE FOR REAL LIFE</span></footer>

      {/* Enhanced Expense Tracker Modal UI/UX */}
      {showPanel && (
        <div className="panel-backdrop" onClick={() => setShowPanel(false)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <button className="panel-close" onClick={() => setShowPanel(false)} aria-label="Close">
              <X size={18} />
            </button>

            {user ? (
              <>
                {/* User Header & Google Sheet Status */}
                <div className="expense-modal-header">
                  <div>
                    <span className="section-index" style={{ display: "block", marginBottom: "0.2rem", color: "var(--ink)" }}>
                      GOOGLE ACCOUNT CONNECTED
                    </span>
                    <h2 style={{ fontSize: "2rem", margin: 0, lineHeight: 1 }}>
                      {user.name}
                    </h2>
                    <small style={{ color: "rgba(10,10,10,0.6)", fontSize: "0.62rem" }}>
                      {user.email}
                    </small>
                  </div>

                  {user.activeSpreadsheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${user.activeSpreadsheetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.4rem 0.75rem",
                        borderRadius: "99px",
                        background: "rgba(10,10,10,0.08)",
                        color: "var(--ink)",
                        font: "0.6rem var(--mono)",
                        textDecoration: "none",
                        transition: "background 0.2s",
                      }}
                      title="Open spreadsheet in Google Sheets"
                    >
                      <ExternalLink size={12} /> View Sheet
                    </a>
                  )}
                </div>

                {!user.activeSpreadsheetId ? (
                  <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
                    <p style={{ width: "100%", marginBottom: "1.5rem" }}>
                      You haven't connected a Google Sheet yet. Create one with one click to store your expenses safely in your own Google Drive.
                    </p>
                    <button className="panel-submit" onClick={handleCreateSheet} disabled={isSubmitting}>
                      {isSubmitting ? "Creating Google Sheet..." : "Create new Google Sheet"} <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Tab Navigation: Form vs History */}
                    <div className="expense-tab-bar">
                      <button
                        type="button"
                        className={`expense-tab-btn ${modalTab === "form" ? "expense-tab-btn--active" : ""}`}
                        onClick={() => setModalTab("form")}
                      >
                        + Log Expense
                      </button>
                      <button
                        type="button"
                        className={`expense-tab-btn ${modalTab === "history" ? "expense-tab-btn--active" : ""}`}
                        onClick={() => setModalTab("history")}
                      >
                        📋 Entries ({userExpenses.length})
                      </button>
                    </div>

                    {modalTab === "form" ? (
                      <form onSubmit={handleAddExpense}>
                        {/* Big Tactile Amount Box */}
                        <label style={{ margin: 0 }}>AMOUNT</label>
                        <div className="amount-input-box">
                          <span>{currentCurrency.symbol}</span>
                          <input
                            ref={amountInputRef}
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={formState.amount}
                            onChange={(e) => setFormState({ ...formState, amount: e.target.value })}
                            required
                            autoFocus
                          />
                        </div>

                        {/* Quick Increment Chips */}
                        <div className="amount-quick-chips">
                          {[10, 25, 50, 100, 250].map((inc) => (
                            <button
                              key={inc}
                              type="button"
                              className="amount-quick-chip"
                              onClick={() => {
                                const current = parseFloat(formState.amount) || 0;
                                setFormState({ ...formState, amount: (current + inc).toFixed(2) });
                              }}
                            >
                              +{currentCurrency.symbol}{inc}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="amount-quick-chip"
                            style={{ marginLeft: "auto", color: "var(--orange)" }}
                            onClick={() => setFormState({ ...formState, amount: "" })}
                          >
                            Clear
                          </button>
                        </div>

                        {/* Category Selector Pills */}
                        <label>SELECT CATEGORY</label>
                        <div className="category-pills">
                          {PRESET_CATEGORIES.map((cat) => (
                            <button
                              key={cat.name}
                              type="button"
                              className={`category-pill ${formState.category === cat.name ? "category-pill--active" : ""}`}
                              onClick={() => setFormState({ ...formState, category: cat.name })}
                            >
                              <span>{cat.icon}</span> {cat.name}
                            </button>
                          ))}
                        </div>

                        {/* Description Input */}
                        <div style={{ marginTop: "0.8rem" }}>
                          <label style={{ margin: 0 }}>DESCRIPTION</label>
                          <input
                            type="text"
                            className="expense-input"
                            placeholder="e.g., Dinner with friends, weekly groceries, taxi..."
                            value={formState.description}
                            onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                            required
                          />
                          {/* Quick description chips for 1-tap fill */}
                          <div className="desc-suggestions">
                            {["Groceries", "Coffee", "Dinner", "Uber / Transit", "Rent", "Utilities", "Shopping", "Lunch"].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                className="desc-chip"
                                onClick={() => setFormState({ ...formState, description: tag })}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Date Picker with Quick Toggles */}
                        <div style={{ marginTop: "0.6rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <label style={{ margin: 0 }}>DATE</label>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                type="button"
                                className="amount-quick-chip"
                                onClick={() => setFormState({ ...formState, date: new Date().toISOString().split("T")[0] })}
                              >
                                Today
                              </button>
                              <button
                                type="button"
                                className="amount-quick-chip"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() - 1);
                                  setFormState({ ...formState, date: d.toISOString().split("T")[0] });
                                }}
                              >
                                Yesterday
                              </button>
                            </div>
                          </div>
                          <input
                            type="date"
                            className="expense-input"
                            value={formState.date}
                            onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                            required
                          />
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          className="panel-submit"
                          disabled={isSubmitting}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            marginTop: "1.6rem",
                            padding: "1rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          {isSubmitting ? "Writing to Google Sheets..." : `Save ${currentCurrency.symbol}${formState.amount || "0.00"} to Sheet`} <ArrowRight size={16} />
                        </button>
                      </form>
                    ) : (
                      /* Recent Entries List from Google Sheets */
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ font: "0.65rem var(--mono)", color: "rgba(10,10,10,0.6)" }}>
                            TOTAL: <b>{monthlyTotalFormatted}</b> ({userExpenses.length} entries)
                          </span>
                        </div>

                        {userExpenses.length === 0 ? (
                          <div style={{ padding: "2.5rem 0", textAlign: "center", color: "rgba(10,10,10,0.6)" }}>
                            <p style={{ width: "100%", margin: "0 auto" }}>
                              No expenses logged yet. Tap "+ Log Expense" above to add your first transaction!
                            </p>
                          </div>
                        ) : (
                          <div className="expense-history-list">
                            {userExpenses.map((exp) => (
                              <div className="expense-history-item" key={exp.rowId}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <span style={{ fontWeight: 600 }}>{exp.description}</span>
                                    <span style={{ opacity: 0.6, fontSize: "0.58rem" }}>
                                      ({exp.category})
                                    </span>
                                  </div>
                                  <span style={{ opacity: 0.5, fontSize: "0.58rem" }}>{exp.date}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                  <strong style={{ fontSize: "0.85rem" }}>
                                    −{formatAmount(exp.amount)}
                                  </strong>
                                  <button
                                    type="button"
                                    className="expense-del-btn"
                                    onClick={() => handleDeleteExpense(exp.rowId)}
                                    title="Delete from Google Sheet"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {feedback && (
                  <small style={{ color: "var(--ink)", display: "block", marginTop: "0.8rem", fontWeight: 600 }}>
                    {feedback}
                  </small>
                )}

                {/* Footer Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.4rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(10,10,10,0.1)" }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "rgba(10,10,10,0.5)",
                      cursor: "pointer",
                      font: "0.62rem var(--mono)",
                      textDecoration: "underline",
                    }}
                  >
                    Sign out
                  </button>

                  <span style={{ font: "0.55rem var(--mono)", opacity: 0.5 }}>
                    SYNCED WITH DRIVE
                  </span>
                </div>
              </>
            ) : (
              /* Unauthenticated Google Sign In State */
              <>
                <span className="panel-mark">L</span>
                <span className="section-index">EXPENSE ORBIT</span>
                <h2>Watch your<br /><em>spending move.</em></h2>
                <p>
                  Connect your Google account to track and visualize expenses directly inside your personal Google Sheets. No external database, 100% private.
                </p>

                <button
                  className="panel-submit"
                  onClick={loginWithGoogle}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.6rem",
                    padding: "1rem",
                    fontSize: "0.75rem",
                  }}
                >
                  Continue with Google <ArrowRight size={16} />
                </button>

                {feedback && <small style={{ color: "var(--ink)", display: "block", marginTop: "0.8rem" }}>{feedback}</small>}

                <small style={{ marginTop: "1.2rem", lineHeight: 1.5 }}>
                  Uses Google OAuth 2.0. Tokens are securely encrypted with AES-256-GCM.
                </small>
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Spending Details Modal */}
      {selectedCategory && (
        <div className="panel-backdrop" onClick={() => setSelectedCategory(null)}>
          <div
            className={`category-detail-modal category-detail-modal--${selectedCategory.color}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="panel-close"
              onClick={() => setSelectedCategory(null)}
              aria-label="Close details"
            >
              <X size={18} />
            </button>

            <div className="category-detail-header">
              <div>
                <div className="category-detail-badge">
                  <span>{selectedCategory.icon}</span>
                  <span>CATEGORY BREAKDOWN</span>
                </div>
                <h2 className="category-detail-title">{selectedCategory.name}</h2>
                <span className="category-detail-count">
                  {user
                    ? `${userExpenses.filter((e) => e.category.toLowerCase() === selectedCategory.name.toLowerCase()).length} recorded transaction(s)`
                    : `${selectedCategory.note} (sample preview)`}
                </span>
              </div>

              <div className="category-detail-meta">
                <span className="category-detail-count" style={{ display: "block", marginBottom: "0.2rem" }}>
                  TOTAL SPENT
                </span>
                <span className="category-detail-total">
                  {formatAmount(selectedCategory.baseUsd)}
                </span>
                {rawMonthlyTotalUsd > 0 && (
                  <span style={{ font: "0.6rem var(--mono)", opacity: 0.65 }}>
                    {Math.round((selectedCategory.baseUsd / rawMonthlyTotalUsd) * 100)}% of monthly spend
                  </span>
                )}
              </div>
            </div>

            {/* List of expenses with descriptions */}
            <div>
              <span style={{ font: "600 0.62rem var(--mono)", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                ITEMIZED EXPENSES &amp; DESCRIPTIONS
              </span>

              <div className="category-trans-list">
                {(() => {
                  const matchingExpenses = user
                    ? userExpenses.filter(
                        (e) => e.category.toLowerCase() === selectedCategory.name.toLowerCase()
                      )
                    : (DEMO_CATEGORY_DETAILS[selectedCategory.name] || []).map((d, i) => ({
                        rowId: i,
                        date: d.date,
                        category: selectedCategory.name,
                        description: d.description,
                        amount: d.amountUsd,
                      }));

                  if (matchingExpenses.length === 0) {
                    return (
                      <div style={{ padding: "2.5rem 1rem", textAlign: "center", background: "rgba(255,255,255,0.45)", borderRadius: "6px" }}>
                        <p style={{ margin: "0 0 0.5rem", font: "600 0.78rem var(--display)" }}>
                          No expenses recorded under {selectedCategory.name} yet.
                        </p>
                        <span style={{ font: "0.62rem var(--mono)", opacity: 0.65 }}>
                          Tap the button below to add your first {selectedCategory.name.toLowerCase()} expense!
                        </span>
                      </div>
                    );
                  }

                  return matchingExpenses.map((item, idx) => (
                    <div className="category-trans-item" key={item.rowId || idx}>
                      <div>
                        <div className="category-trans-desc">{item.description}</div>
                        <span className="category-trans-date">{item.date}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        <span className="category-trans-amount">
                          −{formatAmount(item.amount)}
                        </span>
                        {user && item.rowId && (
                          <button
                            type="button"
                            className="expense-del-btn"
                            onClick={() => handleDeleteExpense(item.rowId)}
                            title="Delete from Google Sheet"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.2rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(10,10,10,0.14)" }}>
              <button
                type="button"
                className="panel-submit"
                style={{
                  margin: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.75rem 1.2rem",
                  fontSize: "0.68rem",
                }}
                onClick={() => {
                  const catName = selectedCategory.name;
                  setSelectedCategory(null);
                  setFormState((prev) => ({
                    ...prev,
                    category: catName,
                    amount: "",
                    description: "",
                  }));
                  setModalTab("form");
                  setShowPanel(true);
                  setTimeout(() => amountInputRef.current?.focus(), 150);
                }}
              >
                <Plus size={14} /> Add new {selectedCategory.name} expense <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--ink)",
                  font: "0.62rem var(--mono)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  opacity: 0.7,
                }}
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
