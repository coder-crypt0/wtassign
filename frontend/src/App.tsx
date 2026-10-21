import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, dateLabel, initials, request, timeLabel } from "./api";
import { Icon, WicketsLogo } from "./Icons";
import type { IconName } from "./Icons";
import type {
  Ball,
  Detail,
  Innings,
  Leaders,
  Match,
  Outcome,
  Team,
} from "./types";

type View = "matches" | "schedule" | "players" | "saved";
type Filter = "ALL" | "LIVE" | "UPCOMING" | "COMPLETED";
const filters: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All matches" },
  { value: "LIVE", label: "Live now" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "COMPLETED", label: "Results" },
];
const navigation: { id: View; label: string; icon: IconName }[] = [
  { id: "matches", label: "Match centre", icon: "grid" },
  { id: "schedule", label: "Schedule", icon: "calendar" },
  { id: "players", label: "Player index", icon: "players" },
  { id: "saved", label: "My boundary", icon: "bookmark" },
];
function readSaved(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("crease-saved") || "[]",
    );
    return Array.isArray(value)
      ? value.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}
const priority = (m: Match) =>
  m.status === "LIVE" ? 0 : m.status === "UPCOMING" ? 1 : 2;

export default function App() {
  const [view, setView] = useState<View>("matches");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState("ind-aus");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [tab, setTab] = useState("overview");
  const [saved, setSaved] = useState<string[]>(readSaved);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [scorer, setScorer] = useState(false);
  const [about, setAbout] = useState(false);
  const [leaders, setLeaders] = useState<Leaders | null>(null);
  const [notice, setNotice] = useState("");
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const id = selectedRef.current;
    try {
      const [list, next] = await Promise.all([
        request<Match[]>("/matches"),
        request<Detail>(`/matches/${id}`),
      ]);
      if (version !== refreshVersion.current || id !== selectedRef.current)
        return;
      setMatches(
        list.sort(
          (a, b) =>
            priority(a) - priority(b) ||
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      );
      setDetail((current) =>
        !current ||
        current.match.id !== next.match.id ||
        next.match.revision >= current.match.revision
          ? next
          : current,
      );
      setError("");
    } catch (e) {
      if (version === refreshVersion.current)
        setError(
          e instanceof Error ? e.message : "The score desk is unavailable.",
        );
    } finally {
      if (version === refreshVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    void refresh();
  }, [selected, refresh]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const events = new EventSource("/api/live");
    const connected = () => {
      setConnection("live");
      void refresh();
    };
    events.addEventListener("connected", connected);
    events.addEventListener("score", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void refresh();
      }, 120);
    });
    events.onerror = () => setConnection("reconnecting");
    const fallback = setInterval(() => {
      void refresh();
    }, 20000);
    return () => {
      events.close();
      clearTimeout(timer);
      clearInterval(fallback);
    };
  }, [refresh]);
  useEffect(() => {
    if (view !== "players") return;
    let active = true;
    const load = () =>
      request<Leaders>("/players")
        .then((data) => {
          if (active) setLeaders(data);
        })
        .catch(() => {
          if (active)
            setNotice("Player stats could not be loaded. Please try again.");
        });
    void load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [view]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const bookmark = (id: string) => {
    setSaved((previous) => {
      const next = previous.includes(id)
        ? previous.filter((v) => v !== id)
        : [...previous, id];
      try {
        localStorage.setItem("crease-saved", JSON.stringify(next));
      } catch {
        setNotice("Your browser could not save this preference.");
      }
      return next;
    });
  };
  const select = (id: string) => {
    setSelected(id);
    setView("matches");
    setTab("overview");
    setSearch(false);
  };
  const liveCount = matches.filter((m) => m.status === "LIVE").length;
  const shown = matches.filter(
    (m) =>
      (filter === "ALL" || m.status === filter) &&
      (view !== "saved" || saved.includes(m.id)),
  );
  const active = detail?.innings.at(-1);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setView("matches")}
          aria-label="CREASE home"
        >
          <span className="brand-mark">
            <WicketsLogo />
          </span>
          <span>
            CREASE<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="brand-caption">A DIFFERENT VIEW OF THE GAME</div>
        <div className="sidebar-label">THE PAVILION</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "matches" && liveCount > 0 && (
                <span className="nav-count">{liveCount}</span>
              )}
              {item.id === "saved" && saved.length > 0 && (
                <span className="saved-count">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-feature">
          <div className="feature-ball">
            <span />
            <span />
            <span />
          </div>
          <p>
            Some call it a sport.
            <br />
            <strong>We call it everything.</strong>
          </p>
          <span>EVERY BALL. EVERY FEELING.</span>
        </div>
        <button className="about-link" onClick={() => setAbout(true)}>
          <Icon name="info" size={16} /> Behind the crease{" "}
          <Icon name="external" size={13} />
        </button>
        <div className="sidebar-bottom">
          <span
            className={`connection-dot ${connection === "live" ? "" : "amber"}`}
          />
          <span>
            {connection === "live"
              ? "Score desk connected"
              : connection === "connecting"
                ? "Connecting to score desk"
                : "Reconnecting to score desk"}
          </span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            PAVILION <span>/</span>{" "}
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              aria-label="Find a match"
              onClick={() => setSearch(true)}
            >
              <Icon name="search" size={16} />
              <span>Find a match</span>
              <kbd>Ctrl K</kbd>
            </button>
            <span className="edition-badge">
              <span />
              SIMULATED LIVE
            </span>
            <button
              className="avatar"
              onClick={() => setAbout(true)}
              aria-label="About this demo"
            >
              C.
            </button>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="tiny-cross">✳</span>{" "}
                {view === "players"
                  ? "THE NAMES BEHIND THE NUMBERS"
                  : view === "schedule"
                    ? "CLEAR YOUR CALENDAR"
                    : view === "saved"
                      ? "YOUR SIDE OF THE GAME"
                      : "GOOD CRICKET. GREAT COMPANY."}
              </div>
              <h1>
                {view === "matches" ? (
                  <>
                    Inside the <span>boundary.</span>
                  </>
                ) : view === "schedule" ? (
                  <>
                    The next <span>chapter.</span>
                  </>
                ) : view === "players" ? (
                  <>
                    Made for the <span>moment.</span>
                  </>
                ) : (
                  <>
                    Close to <span>the game.</span>
                  </>
                )}
              </h1>
              <p>
                {view === "matches"
                  ? "The big hits. The quiet spells. Everything in between."
                  : view === "schedule"
                    ? "The fixtures worth making time for. All times are local to you."
                    : view === "players"
                      ? "Meet the game changers. Statistics across this simulated tournament."
                      : "Your bookmarked matches, all in one place."}
              </p>
            </div>
            <div className="date-stamp">
              <span>
                {new Intl.DateTimeFormat("en", { weekday: "long" }).format(
                  new Date(),
                )}
              </span>
              <strong>
                {new Intl.DateTimeFormat("en", {
                  day: "2-digit",
                  month: "short",
                }).format(new Date())}
                <i>↗</i>
              </strong>
              <span>IT'S A GOOD DAY FOR CRICKET</span>
            </div>
          </div>

          {error && (
            <div role="alert" className="error-banner">
              <Icon name="radio" />
              <span>
                {error}{" "}
                {detail
                  ? "Showing the last received score."
                  : "Make sure the Spring Boot score desk is running."}
              </span>
              <button onClick={() => void refresh()}>
                Try again <Icon name="refresh" size={14} />
              </button>
            </div>
          )}

          {view !== "players" && (
            <div className="filter-bar">
              <div className="filters" aria-label="Filter matches">
                {filters.map((f) => (
                  <button
                    key={f.value}
                    aria-pressed={filter === f.value}
                    className={filter === f.value ? "selected" : ""}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.value === "LIVE" && <span className="live-dot" />}
                    {f.label}
                    <span className="filter-count">
                      {matches
                        .filter(
                          (m) =>
                            (f.value === "ALL" || m.status === f.value) &&
                            (view !== "saved" || saved.includes(m.id)),
                        )
                        .length.toString()
                        .padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
              <span className="format-tag">
                MEN'S T20 <span>20 OVERS. ENDLESS POSSIBILITIES.</span>
              </span>
            </div>
          )}

          {(view === "matches" || view === "saved") && (
            <>
              <div
                className={`match-strip ${view === "saved" ? "saved-grid" : ""}`}
                aria-label="Matches"
              >
                {shown.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    selected={match.id === selected && view === "matches"}
                    saved={saved.includes(match.id)}
                    onSelect={() => select(match.id)}
                    onSave={() => bookmark(match.id)}
                  />
                ))}
              </div>
              {!shown.length && !loading && (
                <EmptyState
                  title={
                    view === "saved"
                      ? "Keep your favourites close."
                      : "A quiet spell."
                  }
                  description={
                    view === "saved"
                      ? "Tap the bookmark on any match to add it to your boundary."
                      : "No matches in this category. Explore another filter."
                  }
                  onClick={() => {
                    setView("matches");
                    setFilter("ALL");
                  }}
                  label="Explore matches"
                />
              )}
            </>
          )}

          {view === "matches" && (
            <>
              <div className="section-heading">
                <div>
                  <span className="section-number">01 /</span>
                  <h2>In the spotlight</h2>
                </div>
                <span className="small-caption">
                  ONE GAME. A MILLION MOMENTS.
                </span>
              </div>
              {loading && !detail ? (
                <div
                  className="loading-board"
                  aria-label="Loading match"
                  role="status"
                >
                  <div className="skeleton short" />
                  <div className="skeleton large" />
                  <div className="skeleton" />
                  <span>Walking out to the middle…</span>
                </div>
              ) : detail && active ? (
                <>
                  <div className="spotlight-grid">
                    <Scoreboard
                      detail={detail}
                      saved={saved.includes(selected)}
                      onSave={() => bookmark(selected)}
                    />
                    <Pulse detail={detail} />
                  </div>
                  <div className="detail-toolbar">
                    <div
                      className="detail-tabs"
                      role="tablist"
                      aria-label="Match details"
                    >
                      {["overview", "scorecard", "commentary"].map((t) => (
                        <button
                          key={t}
                          role="tab"
                          aria-selected={tab === t}
                          onClick={() => setTab(t)}
                          className={tab === t ? "active" : ""}
                        >
                          {t === "overview"
                            ? "Match overview"
                            : t === "scorecard"
                              ? "Full scorecard"
                              : "Ball by ball"}
                          {t === "commentary" && <span className="tab-dot" />}
                        </button>
                      ))}
                    </div>
                    {detail.match.editable && (
                      <button
                        className="scorer-trigger"
                        onClick={() => setScorer(true)}
                      >
                        <Icon name="sliders" size={16} /> Scorer's desk{" "}
                        <Icon name="arrow" size={16} />
                      </button>
                    )}
                  </div>
                  <section role="tabpanel" aria-label={tab}>
                    {detail.match.status === "UPCOMING" ? (
                      <Upcoming detail={detail} />
                    ) : tab === "overview" ? (
                      <Overview
                        detail={detail}
                        onCommentary={() => setTab("commentary")}
                        onScorecard={() => setTab("scorecard")}
                      />
                    ) : tab === "scorecard" ? (
                      <Scorecard key={selected} detail={detail} />
                    ) : (
                      <Commentary innings={active} />
                    )}
                  </section>
                </>
              ) : null}
            </>
          )}
          {view === "schedule" && (
            <Schedule matches={shown} onSelect={select} />
          )}
          {view === "players" && <PlayerIndex leaders={leaders} />}
          <footer className="footer">
            <span>
              <WicketsLogo /> BUILT AROUND THE GAME.
            </span>
            <p>
              Fictional fixtures. Real cricket logic.{" "}
              <button onClick={() => setAbout(true)}>
                About this simulation <Icon name="arrow" size={12} />
              </button>
            </p>
            <span className="footer-edition">CREASE / VOL. 01</span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Icon name="info" size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      {search && (
        <Modal
          title="Find your game."
          onClose={() => setSearch(false)}
          className="search-modal"
        >
          <div className="search-field">
            <Icon name="search" />
            <input
              autoFocus
              placeholder="Try India, Australia, Barbados…"
              aria-label="Search matches"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>ESC</kbd>
          </div>
          <div className="search-results">
            {matches
              .filter((m) =>
                `${m.home.name} ${m.away.name} ${m.venue} ${m.home.id} ${m.away.id}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((m) => (
                <button key={m.id} onClick={() => select(m.id)}>
                  <TeamBadge team={m.away} />
                  <span>
                    <strong>
                      {m.away.name} <small>vs</small> {m.home.name}
                    </strong>
                    <small>{m.venue}</small>
                  </span>
                  <StatusBadge status={m.status} />
                  <Icon name="arrow" size={17} />
                </button>
              ))}
            {matches.filter((m) =>
              `${m.home.name} ${m.away.name} ${m.venue} ${m.home.id} ${m.away.id}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ).length === 0 && (
              <p className="search-empty">
                No matches found. Try another team or venue.
              </p>
            )}
          </div>
        </Modal>
      )}
      {scorer && detail && (
        <Scorer
          detail={detail}
          onClose={() => setScorer(false)}
          onUpdate={(next) => {
            setDetail(next);
            void refresh();
          }}
        />
      )}
      {about && (
        <Modal title="Every ball has a story." onClose={() => setAbout(false)}>
          <div className="about-content">
            <span className="about-logo">
              <WicketsLogo /> CREASE.
            </span>
            <p>
              A cricket match centre with the soul of a sports journal. Follow
              the chase, explore the numbers, or take the scorer's seat.
            </p>
            <div className="about-note">
              <Icon name="radio" />
              <div>
                <strong>This is a simulation.</strong>
                <p>
                  Fixtures and results are fictional. Scores stream from a
                  Spring Boot scoring engine, with a new delivery every 8
                  seconds while auto-play is running. All player statistics are
                  from this demo.
                </p>
              </div>
            </div>
            <p>
              Open the scorer's desk on a live match to pause auto-play, record
              deliveries, or undo the last ball. Your match data persists across
              restarts.
            </p>
            <span className="eyebrow">
              SPRING BOOT + REACT / MADE FOR MATCHDAY
            </span>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TeamBadge({ team, small = false }: { team: Team; small?: boolean }) {
  return (
    <span
      className={`team-badge ${small ? "small" : ""} team-${team.id.toLowerCase()}`}
      style={{ "--team-color": team.color } as React.CSSProperties}
      aria-label={team.name}
    >
      <span>{team.id === "SA" ? "SA" : team.id.slice(0, 1)}</span>
      <i />
    </span>
  );
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {status === "LIVE" && <span className="live-dot" />}
      {status === "LIVE" ? "LIVE" : status === "UPCOMING" ? "UP NEXT" : "FINAL"}
    </span>
  );
}

function MatchCard({
  match: m,
  selected,
  saved,
  onSelect,
  onSave,
}: {
  match: Match;
  selected: boolean;
  saved: boolean;
  onSelect: () => void;
  onSave: () => void;
}) {
  return (
    <article className={`match-card ${selected ? "is-selected" : ""}`}>
      <button
        className="match-card-main"
        onClick={onSelect}
        aria-label={`View ${m.away.name} versus ${m.home.name}`}
        aria-pressed={selected}
      >
        <div className="match-card-top">
          <StatusBadge status={m.status} />
          <span>
            {m.status === "UPCOMING" ? dateLabel(m.startsAt) : "WORLD T20"}
          </span>
        </div>
        <div className="mini-team">
          <TeamBadge team={m.away} small />
          <strong>{m.away.shortName}</strong>
          <span>
            {m.status === "UPCOMING" ? (
              "—"
            ) : (
              <>
                <b>
                  {m.score}/{m.wickets}
                </b>{" "}
                <small>({m.overs})</small>
              </>
            )}
          </span>
        </div>
        <div className="mini-team muted">
          <TeamBadge team={m.home} small />
          <strong>{m.home.shortName}</strong>
          <span>
            {m.status === "UPCOMING" ? (
              "—"
            ) : (
              <>
                <b>
                  {m.firstInningsScore}/{m.firstInningsWickets}
                </b>{" "}
                <small>({m.firstInningsOvers})</small>
              </>
            )}
          </span>
        </div>
        <div className="match-card-bottom">
          {m.status === "UPCOMING" ? timeLabel(m.startsAt) : m.statusText}
          <Icon name="arrow" size={14} />
        </div>
      </button>
      <button
        className={`bookmark-button ${saved ? "is-saved" : ""}`}
        aria-label={`${saved ? "Unsave" : "Save"} ${m.away.shortName} vs ${m.home.shortName}`}
        aria-pressed={saved}
        onClick={onSave}
      >
        <Icon name="bookmark" size={15} />
      </button>
    </article>
  );
}

function FieldArt() {
  return (
    <svg
      className="field-art"
      viewBox="0 0 330 330"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="field-lines"
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 0v26"
            stroke="#ffffff"
            strokeOpacity=".035"
            strokeWidth="13"
          />
        </pattern>
      </defs>
      <circle
        cx="165"
        cy="165"
        r="151"
        fill="url(#field-lines)"
        stroke="#ffffff"
        strokeOpacity=".14"
      />
      <circle
        cx="165"
        cy="165"
        r="137"
        stroke="#ffffff"
        strokeOpacity=".16"
        strokeDasharray="2 4"
      />
      <ellipse
        cx="165"
        cy="165"
        rx="87"
        ry="106"
        stroke="#ffffff"
        strokeOpacity=".18"
      />
      <path
        d="M155 132h20v66h-20z"
        fill="#b9c48a"
        fillOpacity=".14"
        stroke="#ffffff"
        strokeOpacity=".3"
      />
      <path
        d="M150 142h30m-30 46h30m-23-51v9m16-9v9m-16 37v9m16-9v9"
        stroke="#ffffff"
        strokeOpacity=".4"
      />
      <path
        d="m165 158 81-102"
        stroke="#c8ef79"
        strokeWidth="1.3"
        strokeDasharray="4 5"
      />
      <path d="m241 58 6-4-2 7" stroke="#c8ef79" strokeWidth="1.3" />
      {[
        [165, 152],
        [166, 182],
        [151, 116],
        [113, 86],
        [245, 103],
        [269, 184],
        [216, 232],
        [126, 261],
        [67, 186],
        [88, 133],
        [190, 69],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle
            cx={x}
            cy={y}
            r={i < 2 ? 5 : 3.5}
            fill={i < 2 ? "#c8ef79" : "#768087"}
          />
          {i === 0 && (
            <circle cx={x} cy={y} r="11" stroke="#c8ef79" strokeOpacity=".35" />
          )}
        </g>
      ))}
      <text
        x="165"
        y="312"
        textAnchor="middle"
        fill="#8b9395"
        fontSize="8"
        letterSpacing="2"
      >
        A VIEW FROM THE BOUNDARY
      </text>
    </svg>
  );
}

function Scoreboard({
  detail,
  saved,
  onSave,
}: {
  detail: Detail;
  saved: boolean;
  onSave: () => void;
}) {
  const m = detail.match,
    current = detail.innings.at(-1)!;
  const batting = current.team,
    opposition = current.bowlingTeam;
  return (
    <article className="scoreboard" aria-label="Live scoreboard">
      <FieldArt />
      <div className="scoreboard-top">
        <span>
          <StatusBadge status={m.status} />
          <span className="scoreboard-competition">{m.tournament}</span>
        </span>
        <button
          className={`icon-button ${saved ? "is-saved" : ""}`}
          aria-label={saved ? "Remove match bookmark" : "Bookmark this match"}
          aria-pressed={saved}
          onClick={onSave}
        >
          <Icon name="bookmark" size={19} />
        </button>
      </div>
      <div className="scoreboard-venue">
        <Icon name="pin" size={12} />
        {m.venue}
      </div>
      <div className="scoreboard-main">
        <div className="batting-label">
          <TeamBadge team={batting} />
          <h3>{batting.name}</h3>
          {m.status === "LIVE" && <span className="bat-icon">↗</span>}
        </div>
        <div className="huge-score" key={`${m.id}-${m.score}-${m.wickets}`}>
          {m.status === "UPCOMING" ? (
            "LET’S PLAY."
          ) : (
            <>
              {m.score}
              <span>/{m.wickets}</span>
              <small>
                {m.overs}
                <em>/ 20 OV</em>
              </small>
            </>
          )}
        </div>
        <div className="opposition">
          <TeamBadge team={opposition} small />
          <span>{opposition.name}</span>
          <strong>
            {m.status === "UPCOMING"
              ? dateLabel(m.startsAt)
              : `${m.firstInningsScore}/${m.firstInningsWickets}`}
          </strong>
          <small>
            {m.status === "UPCOMING" ? timeLabel(m.startsAt) : `(${m.firstInningsOvers} ov)`}
          </small>
        </div>
      </div>
      <div className="scoreboard-metrics">
        <div>
          <span>{m.status === "UPCOMING" ? "FORMAT" : "CURRENT RR"}</span>
          <strong>
            {m.status === "UPCOMING" ? "T20" : m.currentRate.toFixed(2)}
          </strong>
        </div>
        <div>
          <span>{m.status === "UPCOMING" ? "FIRST BALL" : "REQUIRED RR"}</span>
          <strong>
            {m.status === "UPCOMING"
              ? timeLabel(m.startsAt).split(" ").slice(0, 2).join(" ")
              : (m.requiredRate?.toFixed(2) ?? "—")}
          </strong>
        </div>
        <div>
          <span>{m.status === "UPCOMING" ? "INNINGS" : "TARGET"}</span>
          <strong>
            {m.status === "UPCOMING" ? "20 overs" : (m.target ?? "—")}
          </strong>
        </div>
      </div>
      <div
        className={`chase-banner ${m.status === "COMPLETED" ? "finished" : ""}`}
      >
        <span className="chase-star">✳</span>
        <strong>
          {m.status === "UPCOMING"
            ? "A fresh pitch. A new story. See you at the toss."
            : m.statusText}
        </strong>
        {m.status === "LIVE" && (
          <span>{m.autoPlay ? "AUTO-PLAY ON" : "SCORER PAUSED"}</span>
        )}
      </div>
    </article>
  );
}

function Pulse({ detail }: { detail: Detail }) {
  const current = detail.innings.at(-1)!;
  const first = detail.innings[0];
  const max = Math.max(180, ...detail.innings.map((i) => i.runs));
  const ceiling = Math.ceil(max / 60) * 60;
  const path = (innings: Innings) =>
    "M36 174 " +
    innings.oversData
      .map(
        (o) =>
          `L${36 + (o.number / 20) * 264} ${174 - (o.cumulativeRuns / ceiling) * 142}`,
      )
      .join(" ");
  const boundary = current.batters.reduce(
    (sum, b) => sum + b.fours * 4 + b.sixes * 6,
    0,
  );
  return (
    <article className="pulse-card">
      <div className="card-heading">
        <h3>
          The match pulse
          <span className="blue-dot" />
        </h3>
        <Icon name="radio" size={17} />
      </div>
      <p>Two innings. One story.</p>
      <div className="chart-legend">
        <span>
          <i className="line blue" />
          {current.team.shortName}
        </span>
        <span>
          <i className="line gray" />
          {current.bowlingTeam.shortName}
        </span>
        <span>CUMULATIVE RUNS</span>
      </div>
      <svg
        className="pulse-chart"
        viewBox="0 0 320 205"
        role="img"
        aria-label={`Cumulative runs chart. ${current.team.name}: ${current.runs}, ${first.team.name}: ${first.runs}.`}
      >
        {[0, 1, 2, 3].map((n) => (
          <g key={n}>
            <path
              d={`M36 ${174 - (n / 3) * 142}h264`}
              stroke="#e5e6e1"
              strokeDasharray="3 4"
            />
            <text x="25" y={178 - (n / 3) * 142} textAnchor="end">
              {Math.round((ceiling * n) / 3)}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20].map((n) => (
          <text key={n} x={36 + (n / 20) * 264} y="197" textAnchor="middle">
            {n}
          </text>
        ))}
        {detail.innings.length > 1 && (
          <path
            d={path(first)}
            fill="none"
            stroke="#b5bbb8"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
        )}
        <path
          d={path(current)}
          fill="none"
          stroke="#2455ed"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {current.oversData.at(-1) && (
          <circle
            cx={36 + (current.oversData.at(-1)!.number / 20) * 264}
            cy={174 - (current.runs / ceiling) * 142}
            r="4"
            fill="#2455ed"
            stroke="#fff"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="pulse-bottom">
        <div>
          <strong>
            {Math.round(current.runs ? (boundary / current.runs) * 100 : 0)}
            <small>%</small>
          </strong>
          <span>RUNS IN BOUNDARIES</span>
        </div>
        <div className="mini-boundaries">
          <span>
            <b>{current.batters.reduce((s, b) => s + b.fours, 0)}</b>FOURS
          </span>
          <span>
            <b>{current.batters.reduce((s, b) => s + b.sixes, 0)}</b>SIXES
          </span>
        </div>
      </div>
    </article>
  );
}

function BallChip({ ball }: { ball: Ball }) {
  return (
    <span
      title={`${ball.over}: ${ball.commentary}`}
      className={`ball-chip ${ball.outcome === "WICKET" ? "wicket" : ball.label === "6" ? "six" : ball.label === "4" ? "four" : ball.outcome !== "RUN" ? "extra" : ""}`}
    >
      {ball.label}
    </span>
  );
}

function Overview({
  detail,
  onCommentary,
  onScorecard,
}: {
  detail: Detail;
  onCommentary: () => void;
  onScorecard: () => void;
}) {
  const current = detail.innings.at(-1)!;
  const active = current.batters
    .filter(
      (b) =>
        ["striker", "non-striker", "not out"].includes(b.status) &&
        (b.balls > 0 || b.status !== "not out"),
    )
    .slice(-2);
  const recent = current.commentary.slice(-12);
  const last = current.commentary.at(-1);
  return (
    <>
      <div className="overview-grid">
        <article className="batting-card">
          <div className="card-heading">
            <h3>In the middle</h3>
            <span className="small-caption">
              {current.team.name.toUpperCase()} · BATTING
            </span>
          </div>
          <div className="table-scroll">
            <table className="batting-now">
              <thead>
                <tr>
                  <th>BATTER</th>
                  <th>R</th>
                  <th>B</th>
                  <th>4s</th>
                  <th>6s</th>
                  <th>SR</th>
                </tr>
              </thead>
              <tbody>
                {active.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span
                        className={`player-initial ${b.status === "striker" ? "on-strike" : ""}`}
                      >
                        {initials(b.name)}
                      </span>
                      <span className="player-name">
                        {b.name}
                        {b.status === "striker" && <i>*</i>}
                        <small>
                          {b.status === "striker"
                            ? "ON STRIKE"
                            : "AT THE CREASE"}
                        </small>
                      </span>
                    </td>
                    <td>
                      <b>{b.runs}</b>
                    </td>
                    <td>{b.balls}</td>
                    <td>{b.fours}</td>
                    <td>{b.sixes}</td>
                    <td>{b.strikeRate.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="partnership">
            <span>
              <i />
              Partnership{" "}
              <strong>
                {current.partnershipRuns}{" "}
                <small>({current.partnershipBalls})</small>
              </strong>
            </span>
            <button onClick={onScorecard}>
              Full scorecard <Icon name="arrow" size={14} />
            </button>
          </div>
        </article>
        <article className="recent-card">
          <div className="card-heading">
            <h3>Ball by ball</h3>
            <span className="small-caption">LATEST 12</span>
          </div>
          <div className="ball-ribbon">
            {recent.map((ball) => (
              <BallChip key={ball.id} ball={ball} />
            ))}
          </div>
          {last ? (
            <p className="latest-commentary">
              <strong>{last.over}</strong>
              {last.commentary}
            </p>
          ) : (
            <p className="latest-commentary">Waiting for the first delivery.</p>
          )}
          <button className="text-link" onClick={onCommentary}>
            Follow the conversation <Icon name="arrow" size={15} />
          </button>
        </article>
      </div>
      <div className="insight-strip">
        <span className="insight-symbol">↗</span>
        <div>
          <span>THE INNINGS IN NUMBERS</span>
          <strong>
            {current.runs} runs. {current.balls} balls. Plenty of stories.
          </strong>
        </div>
        <div className="insight-stat">
          <strong>
            {
              current.commentary.filter(
                (b) => b.runs === 0 && b.outcome === "RUN",
              ).length
            }
          </strong>
          <span>DOT BALLS</span>
        </div>
        <div className="insight-stat">
          <strong>{current.fallOfWickets.length}</strong>
          <span>BREAKTHROUGHS</span>
        </div>
        <div className="insight-stat">
          <strong>{Math.max(0, 120 - current.balls)}</strong>
          <span>BALLS REMAINING</span>
        </div>
      </div>
    </>
  );
}

function Scorecard({ detail }: { detail: Detail }) {
  const [number, setNumber] = useState(detail.innings.length - 1);
  const i = detail.innings[number] || detail.innings[0];
  return (
    <div className="scorecard-panel">
      <div className="innings-switch">
        {detail.innings.map((innings, n) => (
          <button
            key={innings.number}
            className={n === number ? "active" : ""}
            onClick={() => setNumber(n)}
          >
            <TeamBadge team={innings.team} small />
            {innings.team.name}
            <strong>
              {innings.runs}/{innings.wickets}
            </strong>
          </button>
        ))}
      </div>
      <div className="table-scroll">
        <table className="full-table">
          <thead>
            <tr>
              <th>BATTER</th>
              <th>STATUS</th>
              <th>R</th>
              <th>B</th>
              <th>4s</th>
              <th>6s</th>
              <th>SR</th>
            </tr>
          </thead>
          <tbody>
            {i.batters.map((b) => (
              <tr
                key={b.id}
                className={b.status === "striker" ? "highlight-row" : ""}
              >
                <td>
                  <strong>
                    {b.name} {b.status === "striker" && "*"}
                  </strong>
                  <small>{b.role}</small>
                </td>
                <td>
                  <span
                    className={`batter-status ${b.status === "out" ? "out" : ""}`}
                  >
                    {b.status === "striker"
                      ? "On strike"
                      : b.status === "non-striker"
                        ? "Not out"
                        : b.status}
                  </span>
                </td>
                <td>
                  <strong>{b.runs}</strong>
                </td>
                <td>{b.balls}</td>
                <td>{b.fours}</td>
                <td>{b.sixes}</td>
                <td>{b.strikeRate.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                TOTAL <span>Extras: {i.extras}</span>
              </td>
              <td colSpan={5}>
                <strong>
                  {i.runs}/{i.wickets}
                </strong>{" "}
                <span>
                  ({i.overs} overs) · RR {i.runRate.toFixed(2)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="bowling-title">
        <h3>The bowling attack</h3>
        <span>{i.bowlingTeam.name}</span>
      </div>
      <div className="table-scroll">
        <table className="full-table bowling-table">
          <thead>
            <tr>
              <th>BOWLER</th>
              <th>O</th>
              <th>R</th>
              <th>W</th>
              <th>ECON</th>
            </tr>
          </thead>
          <tbody>
            {i.bowlers.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.name}</strong>
                </td>
                <td>{b.overs}</td>
                <td>{b.runs}</td>
                <td>
                  <strong>{b.wickets}</strong>
                </td>
                <td>{b.economy.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {i.fallOfWickets.length > 0 && (
        <div className="fall-of-wickets">
          <h4>FALL OF WICKETS</h4>
          <div>
            {i.fallOfWickets.map((f) => (
              <span key={f.wicket}>
                <strong>
                  {f.score}/{f.wicket}
                </strong>
                <span>{f.player}</span>
                <small>{f.over} ov</small>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Commentary({ innings }: { innings: Innings }) {
  const [only, setOnly] = useState("all");
  const balls = [...innings.commentary]
    .reverse()
    .filter(
      (b) =>
        only === "all" ||
        (only === "wickets"
          ? b.outcome === "WICKET"
          : b.outcome === "RUN" && [4, 6].includes(b.runs)),
    );
  return (
    <article className="commentary-panel">
      <div className="card-heading">
        <div>
          <h3>The story, delivery by delivery.</h3>
          <p>Newest first · {innings.team.name} innings</p>
        </div>
        <div className="small-filters">
          {["all", "boundaries", "wickets"].map((f) => (
            <button
              key={f}
              className={only === f ? "active" : ""}
              onClick={() => setOnly(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {balls.length ? (
        balls.map((b) => (
          <div
            className={`commentary-row ${b.outcome === "WICKET" ? "is-wicket" : ""}`}
            key={b.id}
          >
            <span className="commentary-over">
              {b.over}
              <small>OVER</small>
            </span>
            <BallChip ball={b} />
            <p>{b.commentary}</p>
            <strong>
              {b.score}
              <span>/{b.wickets}</span>
            </strong>
          </div>
        ))
      ) : (
        <div className="inline-empty">
          No {only === "all" ? "deliveries" : only} yet. Stay with the game.
        </div>
      )}
    </article>
  );
}

function Upcoming({ detail }: { detail: Detail }) {
  const m = detail.match;
  return (
    <article className="upcoming-panel">
      <div className="upcoming-kicker">THE STAGE IS SET.</div>
      <h2>
        {m.away.name} <span>vs</span> {m.home.name}
      </h2>
      <p>
        <Icon name="pin" size={16} />
        {m.venue}
      </p>
      <strong>
        {dateLabel(m.startsAt)} · {timeLabel(m.startsAt)}
      </strong>
      <div className="squad-grid">
        {[m.away, m.home].map((team) => (
          <div key={team.id}>
            <h3>
              <TeamBadge team={team} small />
              {team.name} squad
            </h3>
            {team.players.map((p) => (
              <p key={p.id}>
                {p.name}
                <span>{p.role}</span>
              </p>
            ))}
          </div>
        ))}
      </div>
    </article>
  );
}

function Schedule({
  matches,
  onSelect,
}: {
  matches: Match[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="schedule-panel">
      {matches.length ? (
        [...new Set(matches.map((m) => dateLabel(m.startsAt)))].map((day) => (
          <section key={day}>
            <h2>
              {day}
              <span>MATCHDAY</span>
            </h2>
            {matches
              .filter((m) => dateLabel(m.startsAt) === day)
              .map((m) => (
                <button
                  className="schedule-row"
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                >
                  <span className="schedule-time">
                    {timeLabel(m.startsAt)}
                    <StatusBadge status={m.status} />
                  </span>
                  <span className="schedule-teams">
                    <TeamBadge team={m.away} />
                    <strong>{m.away.name}</strong>
                    <small>vs</small>
                    <strong>{m.home.name}</strong>
                    <TeamBadge team={m.home} />
                  </span>
                  <span className="schedule-venue">
                    {m.venue}
                    <small>
                      {m.status === "COMPLETED" ? m.result : m.tournament}
                    </small>
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
          </section>
        ))
      ) : (
        <p className="inline-empty">No fixtures in this category.</p>
      )}
    </div>
  );
}

function PlayerIndex({ leaders }: { leaders: Leaders | null }) {
  const [kind, setKind] = useState<"batters" | "bowlers">("batters");
  const [q, setQ] = useState("");
  if (!leaders)
    return (
      <div className="loading-board" role="status">
        Bringing in the game changers…
      </div>
    );
  const top = leaders[kind][0];
  return (
    <div className="players-panel">
      {top && (
        <div className="player-hero">
          <span className="player-rank">01</span>
          <div>
            <span className="eyebrow">
              {kind === "batters"
                ? "SETTING THE STANDARD"
                : "BREAKING THE PARTNERSHIPS"}
            </span>
            <h2>{top.name}</h2>
            <p>
              {top.team} <span>·</span> TOURNAMENT LEADER
            </p>
          </div>
          <div className="player-top-stat">
            <strong>{kind === "batters" ? top.runs : top.wickets}</strong>
            <span>
              {kind === "batters" ? "RUNS & COUNTING" : "WICKETS & COUNTING"}
            </span>
          </div>
        </div>
      )}
      <div className="players-toolbar">
        <div className="small-filters">
          {(["batters", "bowlers"] as const).map((k) => (
            <button
              key={k}
              className={kind === k ? "active" : ""}
              onClick={() => setKind(k)}
            >
              {k === "batters" ? "Batting leaders" : "Bowling leaders"}
            </button>
          ))}
        </div>
        <label className="player-search">
          <Icon name="search" size={16} />
          <input
            placeholder="Find a player or team"
            aria-label="Search players"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <div className="table-scroll">
        <table className="full-table players-table">
          <thead>
            <tr>
              <th>RANK</th>
              <th>PLAYER</th>
              <th>TEAM</th>
              <th>{kind === "batters" ? "RUNS" : "WICKETS"}</th>
              <th>{kind === "batters" ? "BALLS" : "RUNS"}</th>
              <th>{kind === "batters" ? "4s / 6s" : "BALLS"}</th>
              <th>{kind === "batters" ? "SR" : "ECON"}</th>
            </tr>
          </thead>
          <tbody>
            {leaders[kind]
              .filter((p) =>
                `${p.name} ${p.team}`.toLowerCase().includes(q.toLowerCase()),
              )
              .map((p) => (
                <tr key={p.id}>
                  <td>
                    {String(leaders[kind].indexOf(p) + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <span className="player-initial">{initials(p.name)}</span>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.team}</td>
                  <td>
                    <strong>{kind === "batters" ? p.runs : p.wickets}</strong>
                  </td>
                  <td>{kind === "batters" ? p.balls : p.runs}</td>
                  <td>
                    {kind === "batters" ? `${p.fours} / ${p.sixes}` : p.balls}
                  </td>
                  <td>
                    {(kind === "batters" ? p.strikeRate : p.economy)?.toFixed(
                      2,
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {leaders[kind].filter((p) =>
          `${p.name} ${p.team}`.toLowerCase().includes(q.toLowerCase()),
        ).length === 0 && (
          <p className="inline-empty">No players match “{q}”.</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  label,
  onClick,
}: {
  title: string;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="empty-state">
      <Icon name="bookmark" size={40} />
      <h2>{title}</h2>
      <p>{description}</p>
      <button className="primary-button" onClick={onClick}>
        {label}
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  className = "",
  children,
}: {
  title: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = `modal-${className || "info"}`;
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      aria-labelledby={id}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Scorer({
  detail,
  onClose,
  onUpdate,
}: {
  detail: Detail;
  onClose: () => void;
  onUpdate: (d: Detail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const m = detail.match;
  const i = detail.innings.at(-1)!;
  const lastNonWide = [...i.commentary]
    .reverse()
    .find((b) => b.outcome !== "WIDE");
  const freeHit = lastNonWide?.outcome === "NO_BALL";
  const mutate = async (
    path: string,
    method: string,
    body?: object,
    message = "Score updated.",
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const next = await request<Detail>(`/matches/${m.id}${path}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      onUpdate(next);
      setSuccess(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the score.");
      if (e instanceof ApiError && e.status === 409) {
        try {
          onUpdate(await request<Detail>(`/matches/${m.id}`));
        } catch {
          /* Preserve the action error if refresh is unavailable. */
        }
      }
    } finally {
      setBusy(false);
    }
  };
  const score = (outcome: Outcome, runs: number) =>
    mutate(
      "/deliveries",
      "POST",
      {
        requestId: crypto.randomUUID(),
        outcome,
        runs,
        expectedRevision: m.revision,
      },
      "Delivery recorded. The story continues.",
    );
  return (
    <Modal
      title="The scorer's desk."
      onClose={onClose}
      className="scorer-drawer"
    >
      <p className="drawer-intro">You're in control of the next ball.</p>
      <div className="scorer-score">
        <TeamBadge team={i.team} />
        <span>
          {i.team.name}
          <small>{i.overs} OVERS</small>
        </span>
        <strong>
          {m.score}
          <span>/{m.wickets}</span>
        </strong>
      </div>
      <div className="simulation-control">
        <span>
          <i className={`connection-dot ${m.autoPlay ? "" : "amber"}`} />
          <strong>
            {m.status === "COMPLETED"
              ? "Match complete"
              : m.autoPlay
                ? "Auto-play is running"
                : "Auto-play is paused"}
          </strong>
          <small>One delivery every 8 seconds</small>
        </span>
        <button
          disabled={busy || m.status !== "LIVE"}
          aria-label={m.autoPlay ? "Pause simulation" : "Resume simulation"}
          onClick={() =>
            void mutate(
              "/simulation",
              "PATCH",
              { enabled: !m.autoPlay, expectedRevision: m.revision },
              m.autoPlay ? "Auto-play paused." : "Auto-play resumed.",
            )
          }
        >
          <Icon name={m.autoPlay ? "pause" : "play"} size={16} />
          {m.autoPlay ? "Pause" : "Resume"}
        </button>
      </div>
      <p className="scorer-hint">
        Pause auto-play to score at your own pace. Every delivery is saved to
        the match log.
      </p>
      {error && (
        <p className="scorer-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="scorer-success" role="status">
          <Icon name="check" size={15} />
          {success}
        </p>
      )}
      {freeHit && m.status === "LIVE" && (
        <div className="free-hit">
          FREE HIT <span>Wicket scoring is unavailable on this delivery.</span>
        </div>
      )}
      <div className="scorer-section-title">
        OFF THE BAT <span>SELECT RUNS TO RECORD A BALL</span>
      </div>
      <div className="run-buttons">
        {[0, 1, 2, 3, 4, 6].map((run) => (
          <button
            key={run}
            disabled={busy || m.status !== "LIVE"}
            className={run === 4 ? "boundary" : run === 6 ? "maximum" : ""}
            onClick={() => void score("RUN", run)}
            aria-label={`Record ${run} ${run === 1 ? "run" : "runs"}`}
          >
            <strong>{run === 0 ? "•" : run}</strong>
            <span>
              {run === 0
                ? "DOT"
                : run === 4
                  ? "FOUR"
                  : run === 6
                    ? "SIX"
                    : run === 1
                      ? "RUN"
                      : "RUNS"}
            </span>
          </button>
        ))}
      </div>
      <div className="scorer-section-title">EXTRAS & BREAKTHROUGHS</div>
      <div className="extra-buttons">
        <button
          disabled={busy || m.status !== "LIVE"}
          onClick={() => void score("WIDE", 0)}
        >
          Wide <span>+1 extra</span>
        </button>
        <button
          disabled={busy || m.status !== "LIVE"}
          onClick={() => void score("NO_BALL", 0)}
        >
          No ball <span>+1 & free hit</span>
        </button>
        <button
          className="wicket-button"
          disabled={busy || m.status !== "LIVE" || freeHit}
          onClick={() => void score("WICKET", 0)}
        >
          Wicket <span>Bowler's wicket</span>
        </button>
      </div>
      <button
        className="undo-button"
        disabled={busy || !i.commentary.length}
        onClick={() =>
          void mutate(
            `/deliveries/latest?expectedRevision=${m.revision}`,
            "DELETE",
            undefined,
            "Last delivery undone. Auto-play is paused.",
          )
        }
      >
        <Icon name="undo" size={17} />
        Undo last delivery
      </button>
      <div className="restart-control">
        {confirmRestart ? (
          <>
            <p>
              Return this match to its opening demo checkpoint? Scorer edits
              will be replaced.
            </p>
            <div>
              <button
                disabled={busy}
                onClick={() => {
                  setConfirmRestart(false);
                  void mutate(
                    "/restart",
                    "POST",
                    { expectedRevision: m.revision },
                    "Match restarted. Resume auto-play when you are ready.",
                  );
                }}
              >
                Restart match
              </button>
              <button onClick={() => setConfirmRestart(false)}>
                Keep current score
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => setConfirmRestart(true)}>
            <Icon name="refresh" size={14} />
            Restart this simulation
          </button>
        )}
      </div>
      <div className="scorer-footnote">
        <Icon name="info" size={16} />
        <p>
          This demo records runs, bowler's wickets, wides, and no-balls. Wides
          and no-balls don't count as legal deliveries. Undo also pauses
          auto-play.
        </p>
      </div>
      <div className="revision-label">
        MATCH LOG <span>REVISION {String(m.revision).padStart(4, "0")}</span>
      </div>
    </Modal>
  );
}
