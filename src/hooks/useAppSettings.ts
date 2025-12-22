import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/safeClient";

interface AppSettings {
    upiId: string;
    merchantName: string;
    supportPhone: string;
    supportEmail: string;
}

const defaultSettings: AppSettings = {
    upiId: "",
    merchantName: "EventTix",
    supportPhone: "",
    supportEmail: "",
};

export function useAppSettings() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Try to fetch from a settings table if it exists
            // For now, we'll use event-level settings or fall back to defaults
            const { data: events, error: eventError } = await supabase
                .from("events")
                .select("upi_id, title")
                .not("upi_id", "is", null)
                .limit(1);

            if (!eventError && events && events.length > 0) {
                setSettings(prev => ({
                    ...prev,
                    upiId: events[0].upi_id || "",
                    merchantName: events[0].title || "EventTix",
                }));
            }
        } catch (err) {
            console.error("Error fetching app settings:", err);
            setError("Failed to load settings");
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return {
        settings,
        isLoading,
        error,
        refetch: fetchSettings,
        updateSettings
    };
}
