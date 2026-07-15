import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ProfileSection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    full_name: "",
    email: "",
    mobile_no: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // ✅ Fetch user details
  const fetchUserData = async () => {
    const token = localStorage.getItem("access");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setUser({
          full_name: data.full_name || "",
          email: data.email || "",
          mobile_no: data.mobile_no || "",
        });
        setLoading(false);
      } else {
        console.warn("❌ Token invalid or expired.");
        navigate("/login", { replace: true });
      }
    } catch (error) {
      console.error("⚠️ Error fetching user:", error);
      navigate("/login", { replace: true });
    }
  };

  // ✅ Update user profile (PATCH request)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const token = localStorage.getItem("access");
    if (!token) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: user.full_name,
            mobile_no: user.mobile_no,
          }),
        }
      );

      if (res.ok) {
        const updatedData = await res.json();
        setUser({
          ...user,
          full_name: updatedData.full_name || user.full_name,
          mobile_no: updatedData.mobile_no || user.mobile_no,
        });
        setMessage("✅ Profile updated successfully!");
      } else {
        setMessage("❌ Failed to update profile.");
      }
    } catch (error) {
      console.error("⚠️ Error updating user:", error);
      setMessage("❌ Something went wrong while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Logout function
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}>Loading profile...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>👤 User Profile</h2>

      <form style={styles.form} onSubmit={handleSave}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Full Name</label>
          <input
            type="text"
            value={user.full_name}
            onChange={(e) => setUser({ ...user, full_name: e.target.value })}
            style={styles.input}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={user.email}
            readOnly
            style={{ ...styles.input, backgroundColor: "#eee" }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Mobile Number</label>
          <input
            type="text"
            value={user.mobile_no}
            onChange={(e) => setUser({ ...user, mobile_no: e.target.value })}
            style={styles.input}
          />
        </div>

        {message && (
          <p
            style={{
              color: message.startsWith("✅") ? "green" : "red",
              fontWeight: "bold",
            }}
          >
            {message}
          </p>
        )}

        <button type="submit" style={styles.saveBtn} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      <button onClick={handleLogout} style={styles.logoutBtn}>
        Logout
      </button>
    </div>
  );
};

// ✅ Inline Styles
const styles = {
  container: {
    maxWidth: "450px",
    margin: "50px auto",
    padding: "30px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: "25px",
    fontSize: "1.6rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    marginBottom: "5px",
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    backgroundColor: "#fff",
  },
  saveBtn: {
    marginTop: "15px",
    width: "100%",
    backgroundColor: "#4CAF50",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
  },
  logoutBtn: {
    marginTop: "20px",
    width: "100%",
    backgroundColor: "#f44336",
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
  },
};

export default ProfileSection;
