
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plane,
  Hotel,
  CalendarDays,
  MapPin,
  ArrowLeft,
  FileText,
  Download,
  Eye,
  ChevronRight,
  LogOut,
  Loader2,
  Clock,
  Luggage,
} from "lucide-react";

type Booking = {
  id: string;
  [key: string]: any;
};

type Activity = {
  id: string;
  title: string;
  activity_time?: string;
  day_title?: string;
  day_date?: string;
  [key: string]: any;
};

type Trip = {
  id: string;
  name: string;
  destination: string;
};

type Page = "home" | "flights" | "stays" | "activities";

const COOKIE_NAME = "travl_access_code";

function getSavedCode() {
  if (typeof document === "undefined") return "";
  const row = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${COOKIE_NAME}=`));

  return row
    ? decodeURIComponent(row.split("=").slice(1).join("="))
    : "";
}

function saveCode(code: string) {
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: any;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <div className="v1-field">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

export default function Home() {
  const [code, setCode] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [dataError, setDataError] = useState("");

  const [page, setPage] = useState<Page>("home");
  const [selected, setSelected] = useState<Booking | null>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [flights, setFlights] = useState<Booking[]>([]);
  const [stays, setStays] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const loadData = useCallback(async (accessCode: string) => {
    const headers = { "x-trip-code": accessCode };

    const responses = await Promise.all([
      fetch("/api/itinerary", { headers }),
      fetch("/api/flights", { headers }),
      fetch("/api/stays", { headers }),
    ]);

    if (responses.some((response) => !response.ok)) {
      throw new Error("Unable to load trip information.");
    }

    const [itinerary, flightData, stayData] = await Promise.all(
      responses.map((response) => response.json())
    );

    setTrip(itinerary.trip || null);

    setActivities(
      (itinerary.days || []).flatMap((day: any) =>
        (day.activities || []).map((activity: any) => ({
          ...activity,
          day_title: day.title,
          day_date: day.day_date,
        }))
      )
    );

    setFlights(
      Array.isArray(flightData)
        ? flightData
        : flightData.flights || []
    );

    setStays(
      Array.isArray(stayData)
        ? stayData
        : stayData.stays || []
    );
  }, []);

  useEffect(() => {
    const saved = getSavedCode();

    if (!saved) {
      setLoading(false);
      return;
    }

    setCode(saved);

    loadData(saved)
      .then(() => setAuthenticated(true))
      .catch(() => {
        document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 4) return;

    setLoading(true);
    setLoginError("");

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setLoginError("Incorrect access code. Please try again.");
        return;
      }

      saveCode(code);
      await loadData(code);
      setAuthenticated(true);
    } catch {
      setLoginError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openDocument(
    type: "flights" | "stays",
    id: string,
    download = false
  ) {
    const tab = window.open("about:blank", "_blank");

    try {
      const response = await fetch(
        `/api/${type}/${id}/document${download ? "?download=1" : ""}`,
        { headers: { "x-trip-code": code } }
      );

      if (!response.ok) throw new Error();

      const result = await response.json();
      if (!result.url) throw new Error();

      if (tab) tab.location.href = result.url;
      else window.location.href = result.url;
    } catch {
      tab?.close();
      alert("Unable to open booking document.");
    }
  }

  async function logout() {
    try {
      await fetch("/api/access", { method: "DELETE" });
    } finally {
      document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
      setAuthenticated(false);
      setCode("");
      setPage("home");
      setSelected(null);
    }
  }

  function navigate(next: Page) {
    setSelected(null);
    setPage(next);
  }

  function renderDocumentActions(
    type: "flights" | "stays",
    item: Booking
  ) {
    return (
      <div className="v1-actions">
        <button onClick={() => openDocument(type, item.id)}>
          <Eye size={16} /> View PDF
        </button>
        <button onClick={() => openDocument(type, item.id, true)}>
          <Download size={16} /> Download
        </button>
      </div>
    );
  }

  function renderFlightDetail(item: Booking) {
    return (
      <>
        <div className="v1-route">
          <div>
            <span>DEPARTURE</span>
            <h2>{item.departure_code || "—"}</h2>
            <p>{item.departure_airport || ""}</p>
            <small>{formatDateTime(item.departure_at)}</small>
          </div>

          <Plane size={23} />

          <div>
            <span>ARRIVAL</span>
            <h2>{item.arrival_code || "—"}</h2>
            <p>{item.arrival_airport || ""}</p>
            <small>{formatDateTime(item.arrival_at)}</small>
          </div>
        </div>

        <div className="v1-section">
          <h3>Flight information</h3>
          <div className="v1-fields">
            <Field label="Airline" value={item.airline} />
            <Field label="Flight number" value={item.flight_number} />
            <Field label="PNR" value={item.pnr} />
            <Field label="Booking status" value={item.booking_status} />
            <Field label="Departure terminal" value={item.departure_terminal} />
            <Field label="Arrival terminal" value={item.arrival_terminal} />
          </div>
        </div>

        <div className="v1-section">
          <h3><Luggage size={17} /> Baggage</h3>
          <div className="v1-fields">
            <Field label="Check-in baggage" value={item.baggage_allowance} />
            <Field label="Cabin baggage" value={item.cabin_baggage_allowance} />
          </div>
        </div>
      </>
    );
  }

  function renderStayDetail(item: Booking) {
    return (
      <>
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.hotel_name || "Hotel"}
            className="v1-hotel-image"
          />
        )}

        <div className="v1-section">
          <h3>Stay information</h3>
          <div className="v1-fields">
            <Field label="Hotel" value={item.hotel_name || item.name} />
            <Field label="Location" value={item.location} />
            <Field label="Check-in" value={item.check_in} />
            <Field label="Check-out" value={item.check_out} />
            <Field label="Rooms" value={item.rooms} />
            <Field label="Room type" value={item.room_type} />
            <Field label="Booking reference" value={item.booking_reference} />
          </div>
        </div>

        {item.room_allocation && (
          <div className="v1-section">
            <h3>Room allocation</h3>
            <p>{item.room_allocation}</p>
          </div>
        )}
      </>
    );
  }

  function renderList(items: Booking[], type: "flights" | "stays") {
    const isFlight = type === "flights";

    if (!items.length) {
      return (
        <div className="v1-empty">
          {isFlight ? <Plane size={28} /> : <Hotel size={28} />}
          <h3>No {type} added yet</h3>
          <p>Your booking information will appear here.</p>
        </div>
      );
    }

    return (
      <div className="v1-list">
        {items.map((item) => (
          <button
            key={item.id}
            className="v1-list-card"
            onClick={() => setSelected(item)}
          >
            <div className="v1-list-icon">
              {isFlight ? <Plane /> : <Hotel />}
            </div>

            <div className="v1-list-info">
              <strong>
                {isFlight
                  ? `${item.departure_code || "—"} → ${item.arrival_code || "—"}`
                  : item.hotel_name || item.name || "Hotel booking"}
              </strong>

              <span>
                {isFlight
                  ? `${item.airline || ""} ${item.flight_number || ""}`
                  : item.location || ""}
              </span>

              <small>
                {isFlight
                  ? formatDate(item.departure_at)
                  : formatDate(item.check_in)}
              </small>
            </div>

            <ChevronRight size={20} />
          </button>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="v1-loading">
        <Loader2 className="v1-spin" size={28} />
        <span>Loading travl.</span>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="v1-login">
        <section className="v1-login-card">
          <p className="v1-brand">travl<span>.</span></p>
          <p className="v1-eyebrow">YOUR PERSONAL TRAVEL SPACE</p>
          <h1>Your trip,<br />all in one place.</h1>
          <p className="v1-muted">
            Enter your four-digit access code to continue.
          </p>

          <form onSubmit={handleLogin}>
            <label>ACCESS CODE</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4}"
              maxLength={4}
              placeholder="••••"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              required
            />

            {loginError && <p className="v1-error">{loginError}</p>}

            <button
              className="v1-primary"
              disabled={code.length !== 4}
            >
              Continue
            </button>
          </form>
        </section>
      </main>
    );
  }

  const title =
    page === "flights"
      ? "Flights"
      : page === "stays"
      ? "Stays"
      : "Activities";

  return (
    <main className="v1-app">
      <header className="v1-header">
        <button className="v1-brand" onClick={() => navigate("home")}>
          travl<span>.</span>
        </button>

        <button className="v1-logout" onClick={logout}>
          <LogOut size={16} /> Exit
        </button>
      </header>

      {selected ? (
        <section className="v1-content">
          <button className="v1-back" onClick={() => setSelected(null)}>
            <ArrowLeft size={17} /> Back to {page}
          </button>

          <div className="v1-detail-card">
            <div className="v1-detail-heading">
              {page === "flights" ? <Plane /> : <Hotel />}
              <div>
                <p className="v1-eyebrow">
                  {page === "flights" ? "FLIGHT BOOKING" : "HOTEL BOOKING"}
                </p>
                <h1>
                  {page === "flights"
                    ? itemTitle(selected, "Flight booking")
                    : itemTitle(selected, "Stay booking")}
                </h1>
              </div>
            </div>

            {page === "flights"
              ? renderFlightDetail(selected)
              : renderStayDetail(selected)}

            {renderDocumentActions(
              page === "flights" ? "flights" : "stays",
              selected
            )}
          </div>
        </section>
      ) : page === "home" ? (
        <section className="v1-content">
          <div className="v1-welcome">
            <p className="v1-eyebrow">YOUR JOURNEY</p>
            <h1>{trip?.name || "Your next adventure"}</h1>
            <p className="v1-muted">
              <MapPin size={15} />
              {trip?.destination || "Your destination"}
            </p>
          </div>

          {dataError && <p className="v1-error">{dataError}</p>}

          <div className="v1-dashboard">
            <button onClick={() => navigate("flights")}>
              <div className="v1-tile-icon"><Plane /></div>
              <strong>Flights</strong>
              <span>{flights.length} bookings</span>
              <ChevronRight className="v1-arrow" />
            </button>

            <button onClick={() => navigate("stays")}>
              <div className="v1-tile-icon"><Hotel /></div>
              <strong>Stays</strong>
              <span>{stays.length} bookings</span>
              <ChevronRight className="v1-arrow" />
            </button>

            <button onClick={() => navigate("activities")}>
              <div className="v1-tile-icon"><CalendarDays /></div>
              <strong>Activities</strong>
              <span>{activities.length} plans</span>
              <ChevronRight className="v1-arrow" />
            </button>
          </div>

          <div className="v1-footer">
            <span>travl. · YOUR TRIP COMPANION</span>
          </div>
        </section>
      ) : (
        <section className="v1-content">
          <button className="v1-back" onClick={() => navigate("home")}>
            <ArrowLeft size={17} /> Dashboard
          </button>

          <div className="v1-section-heading">
            <p className="v1-eyebrow">YOUR JOURNEY</p>
            <h1>{title}</h1>
          </div>

          {page === "flights" && renderList(flights, "flights")}
          {page === "stays" && renderList(stays, "stays")}

          {page === "activities" && (
            <div className="v1-list">
              {activities.length === 0 ? (
                <div className="v1-empty">
                  <CalendarDays size={28} />
                  <h3>No activities added yet</h3>
                  <p>Your itinerary will appear here.</p>
                </div>
              ) : (
                activities.map((activity, index) => (
                  <article className="v1-activity" key={activity.id || index}>
                    <div className="v1-list-icon"><MapPin /></div>
                    <div className="v1-list-info">
                      <strong>{activity.title || "Activity"}</strong>
                      <span>{activity.day_title || "Itinerary"}</span>
                      <small>
                        {[formatDate(activity.day_date), activity.activity_time]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          <div className="v1-footer">
            <span>travl. · YOUR TRIP COMPANION</span>
          </div>
        </section>
      )}
    </main>
  );
}

function itemTitle(item: Booking, fallback: string) {
  return (
    item.title ||
    item.airline ||
    item.hotel_name ||
    item.name ||
    fallback
  );
}
