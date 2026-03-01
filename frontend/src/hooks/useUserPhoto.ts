import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const GRAPH_PHOTO_URL = "https://graph.microsoft.com/v1.0/me/photo/$value";

/**
 * Fetches the current user's profile photo from Microsoft Graph API.
 * Returns a blob URL for the image, or null if unavailable.
 */
export function useUserPhoto(): string | null {
  const { isAuthenticated, getAccessToken } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let revoke: string | null = null;

    (async () => {
      try {
        const token = await getAccessToken();
        const resp = await fetch(GRAPH_PHOTO_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const blob = await resp.blob();
        revoke = URL.createObjectURL(blob);
        setPhotoUrl(revoke);
      } catch {
        // No photo available — fallback to initials
      }
    })();

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [isAuthenticated, getAccessToken]);

  return photoUrl;
}
