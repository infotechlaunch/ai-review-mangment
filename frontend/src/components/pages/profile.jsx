import { useState, useEffect } from "react";
import api from "../../utils/api";

const Avatar = ({ name, size = 64 }) => {
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.35,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text", disabled }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1.5px solid #e5e7eb",
        fontSize: 14,
        color: "#111827",
        background: disabled ? "#f9fafb" : "#fff",
        outline: "none",
        transition: "border-color 0.2s",
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={(e) => { if (!disabled) e.target.style.borderColor = "#6366f1"; }}
      onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
    />
  </div>
);

const StatCard = ({ label, value, icon, color }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: "1px solid #f3f4f6",
      flex: 1,
      minWidth: 130,
    }}
  >
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: color + "18",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

export default function ProfilePage() {
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // User info (read-only — no user update endpoint)
  const [userInfo, setUserInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    createdAt: null,
  });

  // Business/tenant profile (editable)
  const [bizProfile, setBizProfile] = useState({
    businessName: "",
    industry: "",
    address: "",
    city: "",
    country: "",
    phone: "",
    website: "",
    googleReviewLink: "",
    placeId: "",
    rating: null,
    reviewsCount: 0,
    facebookPage: "",
    instagramHandle: "",
    timezone: "",
  });

  const [editingBiz, setEditingBiz] = useState(false);
  const [bizDraft, setBizDraft] = useState({});
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizSaveMsg, setBizSaveMsg] = useState(null);

  // ── Fetch user info ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoadingUser(false); return; }

    fetch(`${api.API_BASE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.user) {
          const u = res.user;
          setUserInfo({
            firstName: u.firstName || "",
            lastName: u.lastName || "",
            email: u.email || "",
            role: u.role || "",
            createdAt: u.createdAt || null,
          });
        }
      })
      .catch(() => setFetchError("Failed to load user info"))
      .finally(() => setLoadingUser(false));
  }, []);

  // ── Fetch business/tenant profile ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoadingBiz(false); return; }

    fetch(`${api.API_BASE_URL}/api/tenant/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setBizProfile({
            businessName: d.businessName || "",
            industry: d.industry || "",
            address: d.address || "",
            city: d.city || "",
            country: d.country || "",
            phone: d.phone || "",
            website: d.website || "",
            googleReviewLink: d.googleReviewLink || "",
            placeId: d.placeId || "",
            rating: d.rating ?? null,
            reviewsCount: d.reviewsCount || 0,
            facebookPage: d.facebookPage || "",
            instagramHandle: d.instagramHandle || "",
            timezone: d.timezone || "",
          });
        }
      })
      .catch(() => setFetchError("Failed to load business profile"))
      .finally(() => setLoadingBiz(false));
  }, []);

  // ── Business edit handlers ───────────────────────────────────────────────
  const handleEditBiz = () => {
    setBizDraft({ ...bizProfile });
    setEditingBiz(true);
  };

  const handleCancelBiz = () => {
    setEditingBiz(false);
    setBizDraft({});
  };

  const handleSaveBiz = async () => {
    setSavingBiz(true);
    setBizSaveMsg(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${api.API_BASE_URL}/api/tenant/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bizDraft),
      });
      const data = await res.json();
      if (data.success) {
        setBizProfile({ ...bizDraft });
        setEditingBiz(false);
        setBizSaveMsg({ type: "success", text: "Business profile updated successfully!" });
      } else {
        setBizSaveMsg({ type: "error", text: data.message || "Save failed. Please try again." });
      }
    } catch {
      setBizSaveMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSavingBiz(false);
      setTimeout(() => setBizSaveMsg(null), 3500);
    }
  };

  const updateBizDraft = (key) => (e) =>
    setBizDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const biz = editingBiz ? bizDraft : bizProfile;
  const fullName = [userInfo.firstName, userInfo.lastName].filter(Boolean).join(" ") || "User";
  const isGoogleConnected = !!bizProfile.placeId;

  // Count connected platforms
  const platformCount =
    (isGoogleConnected ? 1 : 0) +
    (bizProfile.facebookPage ? 1 : 0) +
    (bizProfile.instagramHandle ? 1 : 0);

  const isLoading = loadingUser || loadingBiz;

  return (
    <div
      style={{
        padding: "32px",
        background: "#f8f9fb",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Page Title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 }}>
          View Profile
        </h1>
        <p style={{ fontSize: 14, color: "#9ca3af", marginTop: 4 }}>
          Your account information and connected business details
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 15 }}>
          Loading profile…
        </div>
      )}

      {/* Fetch error */}
      {fetchError && !isLoading && (
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #fca5a5",
            borderRadius: 12,
            padding: "12px 20px",
            marginBottom: 20,
            fontSize: 14,
            color: "#dc2626",
          }}
        >
          ⚠ {fetchError}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Save message */}
          {bizSaveMsg && (
            <div
              style={{
                background: bizSaveMsg.type === "success" ? "#f0fdf4" : "#fff5f5",
                border: `1px solid ${bizSaveMsg.type === "success" ? "#bbf7d0" : "#fca5a5"}`,
                borderRadius: 12,
                padding: "12px 20px",
                marginBottom: 20,
                fontSize: 14,
                color: bizSaveMsg.type === "success" ? "#15803d" : "#dc2626",
                fontWeight: 500,
              }}
            >
              {bizSaveMsg.type === "success" ? "✅" : "⚠"} {bizSaveMsg.text}
            </div>
          )}

          {/* Profile Header Card */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "28px 32px",
              marginBottom: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <Avatar name={fullName} size={84} />

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
                {fullName}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
                {userInfo.role && (
                  <span style={{ textTransform: "capitalize" }}>{userInfo.role}</span>
                )}
                {userInfo.role && bizProfile.businessName && " · "}
                {bizProfile.businessName}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#f0f0ff",
                    color: "#6366f1",
                    borderRadius: 20,
                    padding: "3px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  ✔ Account Active
                </span>
                {isGoogleConnected && (
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#16a34a",
                      borderRadius: 20,
                      padding: "3px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    🔗 Google Connected
                  </span>
                )}
                {bizProfile.city && (
                  <span
                    style={{
                      background: "#f8fafc",
                      color: "#64748b",
                      borderRadius: 20,
                      padding: "3px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    📍 {[bizProfile.city, bizProfile.country].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard
              label="Total Reviews"
              value={bizProfile.reviewsCount || 0}
              icon="⭐"
              color="#f59e0b"
            />
            <StatCard
              label="Avg Rating"
              value={bizProfile.rating != null ? Number(bizProfile.rating).toFixed(1) : "—"}
              icon="📊"
              color="#6366f1"
            />
            <StatCard
              label="Platforms"
              value={platformCount}
              icon="🌐"
              color="#0ea5e9"
            />
            <StatCard
              label="Google Place ID"
              value={isGoogleConnected ? "Active" : "Not set"}
              icon="🗺"
              color="#10b981"
            />
          </div>

          {/* Bottom Row */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

            {/* Left: User Info + Business Details */}
            <div style={{ flex: "2 1 400px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* User Information (read-only) */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "24px 28px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 6 }}>
                  Account Information
                </h2>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 0, marginBottom: 20 }}>
                  Contact your administrator to update name or email.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InputField label="First Name" value={userInfo.firstName} disabled />
                  <InputField label="Last Name" value={userInfo.lastName} disabled />
                  <InputField label="Email Address" type="email" value={userInfo.email} disabled />
                  <InputField
                    label="Role"
                    value={userInfo.role ? userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1) : ""}
                    disabled
                  />
                </div>
              </div>

              {/* Business Details (editable) */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "24px 28px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                    Business Profile
                  </h2>
                  {!editingBiz ? (
                    <button
                      onClick={handleEditBiz}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 8,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        color: "#374151",
                      }}
                    >
                      ✎ Edit
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={handleCancelBiz}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1.5px solid #e5e7eb",
                          background: "#fff",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          color: "#6b7280",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveBiz}
                        disabled={savingBiz || !bizDraft.businessName}
                        style={{
                          padding: "7px 16px",
                          borderRadius: 8,
                          border: "none",
                          background: savingBiz || !bizDraft.businessName
                            ? "#c7d2fe"
                            : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: savingBiz || !bizDraft.businessName ? "not-allowed" : "pointer",
                        }}
                      >
                        {savingBiz ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <InputField
                    label="Business Name *"
                    value={biz.businessName}
                    onChange={updateBizDraft("businessName")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="Industry"
                    value={biz.industry}
                    onChange={updateBizDraft("industry")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="Phone"
                    value={biz.phone}
                    onChange={updateBizDraft("phone")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="Website"
                    value={biz.website}
                    onChange={updateBizDraft("website")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="City"
                    value={biz.city}
                    onChange={updateBizDraft("city")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="Country"
                    value={biz.country}
                    onChange={updateBizDraft("country")}
                    disabled={!editingBiz}
                  />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InputField
                      label="Address"
                      value={biz.address}
                      onChange={updateBizDraft("address")}
                      disabled={!editingBiz}
                    />
                  </div>
                  <InputField
                    label="Facebook Page"
                    value={biz.facebookPage}
                    onChange={updateBizDraft("facebookPage")}
                    disabled={!editingBiz}
                  />
                  <InputField
                    label="Instagram Handle"
                    value={biz.instagramHandle}
                    onChange={updateBizDraft("instagramHandle")}
                    disabled={!editingBiz}
                  />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <InputField
                      label="Google Review Link"
                      value={biz.googleReviewLink}
                      onChange={updateBizDraft("googleReviewLink")}
                      disabled={!editingBiz}
                    />
                    {!editingBiz && biz.googleReviewLink && (
                      <a
                        href={biz.googleReviewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "#6366f1", marginTop: 4, display: "inline-block" }}
                      >
                        Open review link ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Account Details */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 16 }}>
                  Account
                </h2>
                {[
                  {
                    label: "Account Type",
                    value: userInfo.role
                      ? userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)
                      : "—",
                  },
                  {
                    label: "Member Since",
                    value: userInfo.createdAt
                      ? new Date(userInfo.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })
                      : new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                  },
                  { label: "Timezone", value: bizProfile.timezone || "—" },
                  { label: "Business", value: bizProfile.businessName || "—" },
                  {
                    label: "Google",
                    value: isGoogleConnected ? "Connected" : "Not connected",
                    valueStyle: { color: isGoogleConnected ? "#16a34a" : "#9ca3af" },
                  },
                ].map(({ label, value, valueStyle }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#374151", ...valueStyle }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Connected Accounts */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 16 }}>
                  Connected Accounts
                </h2>
                {[
                  {
                    name: "Google",
                    icon: "🔴",
                    connected: isGoogleConnected,
                    detail: bizProfile.placeId ? `Place ID: ${bizProfile.placeId.slice(0, 16)}…` : null,
                  },
                  {
                    name: "Facebook",
                    icon: "🔵",
                    connected: !!bizProfile.facebookPage,
                    detail: bizProfile.facebookPage || null,
                  },
                  {
                    name: "Instagram",
                    icon: "🟣",
                    connected: !!bizProfile.instagramHandle,
                    detail: bizProfile.instagramHandle ? `@${bizProfile.instagramHandle}` : null,
                  },
                ].map(({ name, icon, connected, detail }) => (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                        {icon} {name}
                      </div>
                      {detail && (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{detail}</div>
                      )}
                    </div>
                    <span
                      style={{
                        background: connected ? "#f0fdf4" : "#f3f4f6",
                        color: connected ? "#16a34a" : "#9ca3af",
                        borderRadius: 20,
                        padding: "2px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {connected ? "Connected" : "Not set"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Security */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  padding: "24px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f3f4f6",
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 16 }}>
                  Security
                </h2>
                <button
                  style={{
                    width: "100%",
                    padding: "9px 0",
                    borderRadius: 10,
                    border: "1.5px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    marginBottom: 10,
                  }}
                >
                  🔒 Change Password
                </button>
                <button
                  style={{
                    width: "100%",
                    padding: "9px 0",
                    borderRadius: 10,
                    border: "1.5px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  📱 Enable 2FA
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}