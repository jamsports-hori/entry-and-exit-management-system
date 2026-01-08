export const API_URL = "https://script.google.com/macros/s/AKfycbzaw9EMGvK-vQ-iCMHk_0oUZ2udBud2GtjZRviJhwpNkHLZYbdEQG98ebe8kYomRKOt/exec";

export interface UserData {
    name: string;
    memberType: string;
    insuranceExpiry: string;
    equipment: string;
    color: string;
    lastEntry: string;
    lastExit: string;
}

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: UserData;
    timestamp?: string;
}

// Fetch user data from Google Sheets
export const fetchUserData = async (email: string): Promise<ApiResponse> => {
    try {
        const response = await fetch(`${API_URL}?email=${encodeURIComponent(email)}`, {
            method: "GET",
            mode: "cors", // Important since we are calling a different domain
        });
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        return { success: false, message: "Network Error" };
    }
};

// Send entry/exit record to Google Sheets
// Note: GAS doPost requests often require 'no-cors' mode or a proxy to avoid CORS errors in browser,
// but recently GAS allows simple CORS. If it fails, we might need a workaround (using 'no-cors' assumes success).
// However, 'no-cors' means we can't read the response JSON.
// For this implementation, we will try standard cors first.
export const recordUserAction = async (email: string, action: 'entry' | 'exit', flightCount?: number): Promise<ApiResponse> => {
    try {
        // We use sendBeacon or fetch with keepalive for reliability, but standard fetch is fine for now
        const response = await fetch(API_URL, {
            method: "POST",
            // GAS requires text/plain or specific setup for JSON to be parsed correctly in some contexts, but standard JSON body usually works with the provided script.
            // Actually, GAS doPost(e) with `e.postData.contents` works best with text/plain to avoid preflight issues sometimes.
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({ email, action, flightCount }),
        });

        return await response.json();
    } catch (error) {
        console.error("Post Error:", error);
        return { success: false, message: "Network Error" };
    }
};
// Fetch daily report for a specific date (YYYY-MM-DD or YYYY/MM/DD)
export const fetchDailyReport = async (dateStr: string): Promise<{ success: boolean; data?: any[]; message?: string }> => {
    try {
        // GAS expects 'reportDate' parameter
        const response = await fetch(`${API_URL}?reportDate=${encodeURIComponent(dateStr)}`, {
            method: "GET",
            mode: "cors",
        });
        return await response.json();
    } catch (error) {
        console.error("Report Fetch Error:", error);
        return { success: false, message: "Network Error" };
    }
};
