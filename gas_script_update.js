/**
 * Google Apps Script Code for Daily Report
 * 
 * このコードを既存の Google Apps Script プロジェクトに追加（または統合）してください。
 * Update your 'doGet' function to handle the 'reportDate' parameter.
 */

// 既存の doGet 関数を以下のように修正・拡張してください
function doGet(e) {
    const params = e.parameter;

    // existing logic for single user fetch
    if (params.email) {
        return handleUserFetch(params.email);
    }

    // NEW: Handle Daily Report Fetch
    if (params.reportDate) {
        return handleDailyReport(params.reportDate);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Invalid parameters" }))
        .setMimeType(ContentService.MimeType.JSON);
}

// ユーザー情報取得（既存のロジックをラップしたもの）
function handleUserFetch(email) {
    // ... ここには既存のユーザー取得ロジックが入ります ...
    // (現在の実装をそのまま維持してください)

    // Placeholder implementation based on current API assumptions
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users"); // Adjust sheet name as needed
    // ... searching logic ...
    // This is just a placeholder to show structure. Keep your existing logic here!
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: { /* ... */ } }))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * [NEW] 指定された日付の入下山記録を取得する関数
 * @param {string} dateStr - YYYY-MM-DD 形式の日付文字列
 */
function handleDailyReport(dateStr) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var logSheet = ss.getSheetByName("Logs"); // ★記録用シートの名前に変更してください (例: "Logs", "Records" 等)
        // もし別のスプレッドシートにある場合は:
        // var ss = SpreadsheetApp.openById("ANOTHER_SPREADSHEET_ID");
        // var logSheet = ss.getSheetByName("Sheet1");

        if (!logSheet) {
            return responseJSON({ success: false, message: "Log sheet not found" });
        }

        var data = logSheet.getDataRange().getValues();
        var headers = data[0]; // Assuming first row is header
        var reportData = [];

        // Target Date Object
        var targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        // Iterate through rows (skipping header)
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            // Assuming typical column structure. ADJUST INDICES BASED ON YOUR SHEET!
            // Example Assumption based on provided image columns:
            // Name, EntryTime, ExitTime, MemberType, Area, JHF_No, Expiry, SkillNo, SkillDate, Insurance, InsExpiry, etc.

            // Let's assume there is a 'Date' or 'Timestamp' column. 
            // If the log has separate Date column, use it. If it has EntryTime timestamp, use it.
            var rowDateOrTime = row[1]; // Adjust index! Assuming column 1 is Entry Time or Date

            if (!rowDateOrTime) continue;

            var d = new Date(rowDateOrTime);
            d.setHours(0, 0, 0, 0);

            if (d.getTime() === targetDate.getTime()) {
                // Match found! Construct the record object.
                // Map row indices to the JSON structure expected by the frontend
                reportData.push({
                    name: row[0],
                    entryTime: formatTime(row[1]),
                    exitTime: formatTime(row[2]),
                    memberType: row[3],
                    registrationArea: row[4],
                    jhfNo: row[5],
                    registrationExpiry: formatDate(row[6]),
                    skillNo: row[7],
                    skillDate: formatDate(row[8]),
                    insuranceType: row[9],
                    insuranceExpiry: formatDate(row[10]),
                    size: row[11],
                    color: row[12]
                });
            }
        }

        return responseJSON({ success: true, data: reportData });

    } catch (err) {
        return responseJSON({ success: false, message: err.toString() });
    }
}

// Helper to format response
function responseJSON(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

// Helper to format time (HH:mm:ss)
function formatTime(dateObj) {
    if (!dateObj) return "";
    if (typeof dateObj === 'string') return dateObj; // If already string
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "HH:mm:ss");
}

// Helper to format date (YYYY/MM/DD)
function formatDate(dateObj) {
    if (!dateObj) return "";
    if (typeof dateObj === 'string') return dateObj;
    return Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy/MM/dd");
}
