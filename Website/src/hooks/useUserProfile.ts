import { useState, useEffect } from "react";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

// Module-level cache so multiple components share one fetch result per session
let cachedProfile: any = null;
let fetchPromise: Promise<any> | null = null;

async function fetchProfile(): Promise<any> {
    if (cachedProfile) return cachedProfile;
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch(`${BASE}/profile/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
    })
        .then((r) => r.json())
        .then((j) => {
            if (j.data) {
                cachedProfile = j.data;
                return j.data;
            }
            return null;
        })
        .catch(() => null)
        .finally(() => { fetchPromise = null; });

    return fetchPromise;
}

/** Invalidate cache (call after profile update in Settings) */
export function invalidateProfileCache() {
    cachedProfile = null;
    fetchPromise = null;
}

/**
 * Shared hook: fetches the authenticated user's profile once and caches it.
 * All components that call this hook will share the same cached data.
 */
export function useUserProfile() {
    const [userData, setUserData] = useState<any>(cachedProfile);
    const [loading, setLoading] = useState(!cachedProfile);

    useEffect(() => {
        if (cachedProfile) {
            setUserData(cachedProfile);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchProfile().then((data) => {
            setUserData(data);
            setLoading(false);
        });
    }, []);

    return { userData, loading };
}
