/**
 * =========================================================
 *  入下山管理システム - 完全版統合コード (Ver 4.1 - フライト本数対応版)
 * =========================================================
 * 
 * 変更点:
 * - 下山(exit)時に新しい行を追加するのではなく、その日の入山(entry)行を探して下山時間を書き込みます。
 * - ログシートの列構成をご希望のフォーマットに合わせました。
 * - 下山時にフライト本数を受け取り、保存する機能を追加。
 */

// ==========================================
//  [設定エリア 1] - 既存の会員管理シート(User List)の設定
// ==========================================
const COLUMN_EMAIL = 41;     // メールアドレス列 (AO列)
const COLUMN_NAME = 7;       // 氏名列 (A列)
const COLUMN_ENTRY_TIME = 2; // 入山時間記録先 (B列) - ※会員シート側の記録用
const COLUMN_EXIT_TIME = 3;  // 下山時間記録先 (C列) - ※会員シート側の記録用

// ★会員シートから読み取る情報の列番号を指定してください
// (希望フォーマットに出力するために必要です)
const USER_COLS = {
    memberType: 4,       // 会員種別 (D列)
    area: 5,             // 登録エリア (E列) - ※仮の番号です。実際を確認して変更してください
    jhfNo: 18,            // JPA or JHF登録No (F列) - ※仮
    expiry: 19,           // 登録・有効期限 (G列) - ※仮
    canopy: 25,           // キャノピー/メーカー名 (H列) - ※仮
    color: 27             // カラー (I列) - ※仮
};
// ※ 上記の番号 (5〜9) は、実際の「会員リスト」の列番号に合わせて変更してください！


// ==========================================
//  [設定エリア 2] - 日報ログ用設定
// ==========================================
const LOG_SPREADSHEET_ID = "1oj4pE7El7wYKUr0a1M41Zko1qRK0aJL-qHJ8sGb4Kpc"; // ★ログ用スプレッドシートID
const LOG_SHEET_NAME = "LOG"; // ★ログ用シート名

// ログ保存時の列マッピング (希望フォーマット)
// A:氏名, B:入山, C:下山, D:種別, E:エリア, F:No, G:期限, H:機材, I:色, J:日付(システム用), K:Email(システム用), L:本数
const LOG_COL_INDEX = {
    NAME: 0,
    ENTRY: 1,
    EXIT: 2,
    TYPE: 3,
    AREA: 4,
    NO: 5,
    EXPIRY: 6,
    CANOPY: 7,
    COLOR: 8,
    DATE: 9,   // J列: 日付 (フィルタ用)
    EMAIL: 10, // K列: Email (照合用)
    FLIGHT_COUNT: 11 // L列: フライト本数
};

// ==========================================
//  メイン処理
// ==========================================

function onFormSubmit(e) {
    // [既存の処理そのまま]
    if (!e) return;
    const responses = e.values;
    const userEmail = responses[COLUMN_EMAIL - 1];

    if (!userEmail || !userEmail.includes("@")) return;

    const now = new Date();
    const expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
    const expiryDateStr = Utilities.formatDate(expiryDate, Session.getScriptTimeZone(), "yyyy/MM/dd");

    const qrData = encodeURIComponent(userEmail);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`;

    const htmlBody = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>会員登録ありがとうございます</h2>
      <p>入下山管理用の会員証を発行いたしました。</p>
      <div style="border: 1px solid #ddd; padding: 20px; text-align: center;">
        <img src="${qrUrl}" alt="QR Code" width="200" />
        <p>ID: ${userEmail}</p>
        <p>期限: ${expiryDateStr}</p>
      </div>
    </div>
  `;

    try {
        GmailApp.sendEmail(userEmail, "【ジャムスポーツ】会員証発行【入下山管理】", "HTMLメールをご覧ください", { htmlBody: htmlBody });
    } catch (err) {
        console.log("Mail Error:", err);
    }
}

function doGet(e) {
    const params = e.parameter;
    if (params.email) {
        return handleUserFetch(params.email);
    }
    if (params.reportDate) {
        return handleDailyReport(params.reportDate);
    }
    return createJsonResponse({ success: false, message: "Invalid parameters" });
}

function doPost(e) {
    let postData;
    try {
        postData = JSON.parse(e.postData.contents);
    } catch (err) {
        return createJsonResponse({ success: false, message: "Invalid JSON" });
    }

    const email = postData.email;
    const action = postData.action;
    const flightCount = postData.flightCount; // Optional flight count for exit

    // 1. 会員情報を取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheets()[0];
    const userDataList = userSheet.getDataRange().getValues();

    let userRowIndex = -1;
    for (let i = 1; i < userDataList.length; i++) {
        if (userDataList[i][COLUMN_EMAIL - 1] === email) {
            userRowIndex = i;
            break;
        }
    }

    if (userRowIndex === -1) {
        return createJsonResponse({ success: false, message: "User not found" });
    }

    // 取得した会員詳細データ
    const rowVals = userDataList[userRowIndex];
    const memberDetails = {
        name: rowVals[COLUMN_NAME - 1],
        memberType: rowVals[USER_COLS.memberType - 1] || "",
        area: rowVals[USER_COLS.area - 1] || "",
        jhfNo: rowVals[USER_COLS.jhfNo - 1] || "",
        expiry: formatIfDate(rowVals[USER_COLS.expiry - 1]) || "",
        canopy: rowVals[USER_COLS.canopy - 1] || "",
        color: rowVals[USER_COLS.color - 1] || ""
    };

    const now = new Date();
    const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss"); // 会員シート用
    const shortTimeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss"); // ログ用

    // 2. 会員シート更新 (Last Entry/Exit)
    const sheetRow = userRowIndex + 1;
    if (action === 'entry') {
        userSheet.getRange(sheetRow, COLUMN_ENTRY_TIME).setValue(timeStr);
    } else {
        userSheet.getRange(sheetRow, COLUMN_EXIT_TIME).setValue(timeStr);
    }

    // 3. ログシート更新 (日報用)
    try {
        updateLogSheet(email, action, now, memberDetails, shortTimeStr, flightCount);
    } catch (logErr) {
        console.error(logErr);
    }

    return createJsonResponse({ success: true, message: `${action} recorded`, timestamp: timeStr });
}

// ユーザー情報取得 (アプリ表示用)
function handleUserFetch(email) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][COLUMN_EMAIL - 1] === email) {
            rowIndex = i;
            break;
        }
    }

    if (rowIndex === -1) return createJsonResponse({ success: false, message: "User not found" });

    const r = data[rowIndex];
    // アプリに返すデータ構造
    const responseData = {
        name: r[COLUMN_NAME - 1],
        lastEntry: r[COLUMN_ENTRY_TIME - 1],
        lastExit: r[COLUMN_EXIT_TIME - 1],
        memberType: r[USER_COLS.memberType - 1],
        insuranceExpiry: formatIfDate(r[USER_COLS.expiry - 1]),
        equipment: r[USER_COLS.canopy - 1],
        color: r[USER_COLS.color - 1]
    };
    return createJsonResponse({ success: true, data: responseData });
}

// --- ログ記録ロジック (行更新) ---
function updateLogSheet(email, action, dateObj, details, timeStr, flightCount) {
    // if (LOG_SPREADSHEET_ID === "YOUR_LOG_SPREADSHEET_ID_HERE") return;

    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    const todayStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy/MM/dd");

    if (!sheet) return;

    // 入山 (entry): 新しい行を追加
    if (action === 'entry') {
        // 列順序: Name, Entry, Exit, Type, Area, No, Expiry, Canopy, Color, Date, Email, FlightCount
        const newRow = [
            details.name,
            timeStr,    // Entry Time
            "",         // Exit Time (空)
            details.memberType,
            details.area,
            details.jhfNo,
            details.expiry,
            details.canopy,
            details.color,
            todayStr,   // J列: 日付
            email,      // K列: Email
            ""          // L列: フライト本数
        ];
        sheet.appendRow(newRow);

        // ★赤字チェック: 期限切れなら該当セルを赤にする
        // Expiryは G列 (7列目)
        if (details.expiry) {
            const expiryDate = new Date(details.expiry);
            // 時間を無視して日付のみ比較
            const todayZero = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
            if (expiryDate < todayZero) {
                const lastRow = sheet.getLastRow();
                // 7列目(G列)のフォント色を赤に
                sheet.getRange(lastRow, 7).setFontColor("red").setFontWeight("bold");
            }
        }
    }

    // 下山 (exit): 同一ユーザー・同一日の「下山時間が空」の行を探して更新
    else if (action === 'exit') {
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) return; // データなし

        // 効率のため、下から上に検索
        // データ量が多い場合は getDisplayValues() で一括取得してからループ推奨
        // ここでは直近の履歴を探すため、下からループします
        const range = sheet.getRange(2, 1, lastRow - 1, 12); // A列〜L列
        const values = range.getValues(); // 0-indexed array

        let targetRowIndex = -1;

        // 後ろから検索 (valuesは0始まり、行番号は +2)
        for (let i = values.length - 1; i >= 0; i--) {
            const row = values[i];
            const rEmail = row[10]; // K列 (Email)
            const rDate = row[9];   // J列 (Date) - ※文字列比較
            const rExit = row[2];   // C列 (Exit)

            // 日付フォーマットの揺れを吸収するため、Date型なら変換
            let rowDateStr = rDate;
            if (Object.prototype.toString.call(rDate) === "[object Date]") {
                rowDateStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
            }

            if (rEmail === email && rowDateStr === todayStr && rExit === "") {
                targetRowIndex = i;
                break;
            }
        }

        if (targetRowIndex !== -1) {
            // 発見: 行を更新 (行番号 = targetRowIndex + 2)
            // C列 (3列目) に timeStr を書き込み
            sheet.getRange(targetRowIndex + 2, 3).setValue(timeStr);
            // L列 (12列目) に フライト本数 を書き込み
            if (flightCount !== undefined && flightCount !== null) {
                sheet.getRange(targetRowIndex + 2, 12).setValue(flightCount);
            }
        } else {
            // 対応する入山記録が見つからない場合 (入山忘れ等)
            // 新しい行を追加するか、エラーにするか。ここでは「下山のみ」として行追加します
            const newRow = [
                details.name,
                "",         // Entry Time (不明)
                timeStr,    // Exit Time
                details.memberType,
                details.area,
                details.jhfNo,
                details.expiry,
                details.canopy,
                details.color,
                todayStr,
                email,
                flightCount || ""
            ];
            sheet.appendRow(newRow);
        }
    }
}

// --- 日報処理 & アーカイブ (夜間バッチ用) ---
// トリガー設定: 毎日 23:50〜23:59 頃に実行してください
function processDailyLog() {
    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) return;

    // 1. データ取得
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        console.log("No data to process.");
        return; // ヘッダーのみ、またはデータなし
    }

    const range = sheet.getRange(2, 1, lastRow - 1, 12); // L列まで
    const values = range.getValues();

    // 2. 重複整理 (入山時間の遅い方を残す)
    // Key: Email, Value: Row Data
    const uniqueMap = new Map();

    values.forEach(row => {
        const email = row[10]; // K列
        const entryTimeStr = row[1]; // B列

        if (!uniqueMap.has(email)) {
            uniqueMap.set(email, row);
        } else {
            // 既存と比較
            const existingRow = uniqueMap.get(email);
            const existingEntry = existingRow[1];

            // 比較用にDate化（文字列比較でもフォーマットがYMDHMSなら概ねOKだが、Date推奨）
            const d1 = new Date(entryTimeStr).getTime() || 0;
            const d2 = new Date(existingEntry).getTime() || 0;

            if (d1 > d2) {
                // 今回の方が新しいので上書き
                uniqueMap.set(email, row);
            }
        }
    });

    // 整理後のデータ
    const cleanedValues = Array.from(uniqueMap.values());

    // シートをクリアして書き直し（整理結果のみにする）
    // ※アーカイブ前に整理した状態にする
    sheet.getRange(2, 1, lastRow - 1, 12).clearContent();
    if (cleanedValues.length > 0) {
        sheet.getRange(2, 1, cleanedValues.length, 12).setValues(cleanedValues);
    } else {
        console.log("No valid records found after cleanup. Skipping archive.");
        return;
    }

    // 3. アーカイブ (シートコピー)
    // 今日の日付でシート名を作成
    const archiveName = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");

    // 同名シートが既にないか確認
    let archiveSheet = ss.getSheetByName(archiveName);
    if (archiveSheet) {
        // 既にある場合は削除するか、連番をつけるか...ここでは削除して作り直す
        ss.deleteSheet(archiveSheet);
    }

    // コピー作成
    const copiedSheet = sheet.copyTo(ss);
    copiedSheet.setName(archiveName);

    // 4. 元シートのクリア (ヘッダー以外全削除)
    // 行削除ではなく内容クリアの方が高速かつ安全
    const currentLastRow = sheet.getLastRow();
    if (currentLastRow >= 2) {
        sheet.getRange(2, 1, currentLastRow - 1, 12).clear({ contentsOnly: true, formatOnly: false });
    }

    console.log(`Processed daily log. Archived to ${archiveName} and cleared main log.`);
}


// --- 日報取得ロジック --
function handleDailyReport(dateStr) {
    // if (LOG_SPREADSHEET_ID === "YOUR_LOG_SPREADSHEET_ID_HERE") return ...
    const ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);

    // ★変更: 日報取得機能もアーカイブ対応させる場合
    // 過去日付なら "yyyyMMdd" シートを見るロジックが必要か？
    // 現状は "LOG" シート (当日分) または 指定シートを見る必要があるが
    // ユーザー要望では「当日の」記録を表示とあるので、一旦 LOG シート固定でOK。
    // もし過去のアーカイブを見たい場合はロジック追加が必要。
    // 今回は「本日の記録」なので LOG シートでOK。

    const sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) return createJsonResponse({ success: false });

    const data = sheet.getDataRange().getValues();
    const reportData = [];

    // dateStr (yyyy-MM-dd) と一致する J列(9) を探す
    // 入力 dateStr はハイフン区切り等を想定、シートはスラッシュ区切り
    const targetFormatted = dateStr.replace(/-/g, '/');

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let rowDate = row[9];
        // 日付セルが空の場合はスキップ
        if (!rowDate) continue;

        if (Object.prototype.toString.call(rowDate) === "[object Date]") {
            rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy/MM/dd");
        }

        if (rowDate === targetFormatted) {
            reportData.push({
                name: row[0],
                entryTime: row[1],
                exitTime: row[2],
                memberType: row[3],
                registrationArea: row[4],
                jhfNo: row[5],
                registrationExpiry: row[6],
                equipment: row[7], // canopy
                color: row[8]
            });
        }
    }
    return createJsonResponse({ success: true, data: reportData });
}

function createJsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function formatIfDate(val) {
    if (Object.prototype.toString.call(val) === "[object Date]") {
        return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy/MM/dd");
    }
    return val;
}
