import { useState } from "react";

const Avatar = ({ name, size = 64 }) => {
  const initials = name
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
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: "User",
    role: "User",
    email: "user@example.com",
    phone: "+1 (555) 000-0000",
    company: "Acme Inc.",
    location: "San Francisco, CA",
    bio: "Managing AI-powered review analysis and customer feedback at scale.",
    timezone: "Pacific Time (PT)",
  });

  const [draft, setDraft] = useState({ ...profile });

  const handleSave = () => {
    setProfile({ ...draft });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCancel = () => {
    setDraft({ ...profile });
    setEditing(false);
  };

  const update = (key) => (e) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  const data = editing ? draft : profile;

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
          Manage your personal information and account preferences
        </p>
      </div>

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
        <div style={{ position: "relative" }}>
          <Avatar name={profile.name} size={84} />
          {editing && (
            <button
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#6366f1",
                border: "2px solid #fff",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✎
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {profile.role} · {profile.company}
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
              📍 {profile.location}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: "9px 20px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                background: "#fff",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                color: "#374151",
              }}
            >
              ✎ Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {saved && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 12,
            padding: "12px 20px",
            marginBottom: 20,
            fontSize: 14,
            color: "#15803d",
            fontWeight: 500,
          }}
        >
          ✅ Profile saved successfully!
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total Reviews" value="0" icon="⭐" color="#f59e0b" />
        <StatCard label="Avg Rating" value="0.0" icon="📊" color="#6366f1" />
        <StatCard label="Platforms" value="2" icon="🌐" color="#0ea5e9" />
        <StatCard label="Responses Sent" value="0" icon="💬" color="#10b981" />
      </div>

      {/* Bottom Row */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

        {/* Personal Information */}
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "24px 28px",
            flex: "2 1 380px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1px solid #f3f4f6",
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginTop: 0, marginBottom: 20 }}>
            Personal Information
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <InputField label="Full Name" value={data.name} onChange={update("name")} disabled={!editing} />
            <InputField label="Role" value={data.role} onChange={update("role")} disabled={!editing} />
            <InputField label="Email Address" type="email" value={data.email} onChange={update("email")} disabled={!editing} />
            <InputField label="Phone Number" value={data.phone} onChange={update("phone")} disabled={!editing} />
            <InputField label="Company" value={data.company} onChange={update("company")} disabled={!editing} />
            <InputField label="Location" value={data.location} onChange={update("location")} disabled={!editing} />
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#6b7280" }}>Bio</label>
            <textarea
              value={data.bio}
              onChange={update("bio")}
              disabled={!editing}
              rows={3}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                fontSize: 14,
                color: "#111827",
                background: !editing ? "#f9fafb" : "#fff",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                cursor: !editing ? "not-allowed" : "text",
              }}
              onFocus={(e) => { if (editing) e.target.style.borderColor = "#6366f1"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; }}
            />
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
              { label: "Account Type", value: "Free Plan" },
              {
                label: "Member Since",
                value: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
              },
              { label: "Timezone", value: profile.timezone },
            ].map(({ label, value }) => (
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
                <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{value}</span>
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

          {/* Danger Zone */}
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid #fee2e2",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#dc2626", marginTop: 0, marginBottom: 8 }}>
              Danger Zone
            </h2>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14, marginTop: 0 }}>
              Irreversible and destructive actions.
            </p>
            <button
              style={{
                width: "100%",
                padding: "9px 0",
                borderRadius: 10,
                border: "1.5px solid #fca5a5",
                background: "#fff5f5",
                color: "#dc2626",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}