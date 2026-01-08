/**
 * ==========================================
 *  Mountain Entry Management System - GAS Code
 * ==========================================
 * 
 * 手順:
 * 1. このコードをすべてコピーして、Google Apps Scriptのエディタに貼り付けてください（既存のコードはすべて削除して上書きしてください）。
 * 2. 下記の [設定セクション] の変数を、あなたのスプレッドシート環境に合わせて変更してください。
 * 3. 「デプロイ」>「新しいデプロイ」を選択し、種類を「ウェブアプリ」にしてデプロイしてください。
 *    - アクセスできるユーザー: 「全員」
 */

// ==========================================
//  [設定セクション] - ここを環境に合わせて変更してください
// ==========================================

// 1. ユーザー情報（会員リスト）があるスプレッドシートのIDとシート名
const USERS_SPREADSHEET_ID = "12Ewuu9mylpU7gDhI0kSduV_CAhWDo7Kl0Ix94fZNWXk"; // ★ここにIDを入力
const USERS_SHEET_NAME = "フォームの回答 1"; // ★会員リストのシート名

// 2. 入下山記録（ログ）を保存する「別のスプレッドシート」のIDとシート名
//    同じスプレッドシートの場合は USERS_SPREADSHEET_ID と同じIDを入れてください
const LOGS_SPREADSHEET_ID = "1oj4pE7El7wYKUr0a1M41Zko1qRK0aJL-qHJ8sGb4Kpc"; // ★ここにログ用IDを入力
const LOGS_SHEET_NAME = "LOG"; // ★入下山記録のシート名（例：入山簿）


// ==========================================
//  メイン処理 (doGet / doPost)
// ==========================================

function doGet(e) {
    const params = e.parameter;

    // 1. ユーザー情報の取得 (?email=...)
    if (params.email) {
        return handleUserFetch(params.email);
    }

    // 2. 日報データの取得 (?reportDate=2024-01-01)
    if (params.reportDate) {
        return handleDailyReport(params.reportDate);
    }

    // パラメータがない場合のエラー
    return createJSONOutput({ success: false, message: "Invalid parameters" });
}

function doPost(e) {
    try {
        // POSTデータの解析
        // GASの仕様上、postData.contents をパースする必要があります
        const postData = JSON.parse(e.postData.contents);

        if (postData.email && postData.action) {
            return handleRecordAction(postData.email, postData.action);
        }

        return createJSONOutput({ success: false, message: "Missing email or action" });

    } catch (error) {
        return createJSONOutput({ success: false, message: "Error parsing JSON: " + error.toString() });
    }
}

// ==========================================
//  機能別ロジック
// ==========================================

/**
 * ユーザー情報を検索して返す
 */
function handleUserFetch(email) {
    try {
        const sheet = getSheet(USERS_SPREADSHEET_ID, USERS_SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        // ヘッダー行を除いて検索（1行目がヘッダーと仮定）
        for (let i = 1; i < data.length; i++) {
            // ★列のインデックスは実際のシートに合わせて調整が必要です
            // 例: A列(0)=Email, B列(1)=Name, C列(2)=MemberType ...
            if (data[i][0] === email) { // A列がEmailと仮定
                const userData = {
                    name: data[i][1],           // B列: 氏名
                    memberType: data[i][2],     // C列: 会員種別
                    insuranceExpiry: formatDate(data[i][6]), // G列: 保険期限 (仮)
                    equipment: data[i][7],      // H列: 機材 (仮)
                    lastEntry: "", // ログから取得するロジックが必要ならここに追加
                    lastExit: ""
                };
                // 直近のログを取得して lastEntry/lastExit を埋める処理を入れるとより良いですが、
                // まずは基本情報を返します

                return createJSONOutput({ success: true, data: userData });
            }
        }

        return createJSONOutput({ success: false, message: "User not found" });

    } catch (err) {
        return createJSONOutput({ success: false, message: err.toString() });
    }
}

/**
 * 入山・下山を記録する
 */
function handleRecordAction(email, action) {
    try {
        const sheet = getSheet(LOGS_SPREADSHEET_ID, LOGS_SHEET_NAME);
        const timestamp = new Date();

        // ユーザー情報を検索して付加情報を取得（オプション）
        // ここではシンプルに Email, Action, Time を追記します
        // 必要に応じて、USERSシートから氏名などを引いてきて書き込んでください

        sheet.appendRow([
            email,          // A列
            action,         // B列
            timestamp,      // C列
            formatDate(timestamp), // D列 (日付のみ)
            // ... 他に必要な情報があればここに追加
        ]);

        return createJSONOutput({ success: true, message: "Recorded " + action });

    } catch (err) {
        return createJSONOutput({ success: false, message: err.toString() });
    }
}

/**
 * 指定日の日報データを取得する
 */
function handleDailyReport(dateStr) {
    try {
        const sheet = getSheet(LOGS_SPREADSHEET_ID, LOGS_SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        const reportData = [];

        // 日付の比較用オブジェクト
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0);

        // データのスキャン (1行目はヘッダーと仮定)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];

            // ★ログシートの日付が入っている列を指定 (例: D列=3)
            const logDateRaw = row[3];
            if (!logDateRaw) continue;

            const logDate = new Date(logDateRaw);
            logDate.setHours(0, 0, 0, 0);

            if (logDate.getTime() === targetDate.getTime()) {
                // 画像に合わせたデータ構造を作成
                reportData.push({
                    name: row[0], // データ構造に合わせて修正してください
                    entryTime: formatTime(row[2]),
                    exitTime: formatTime(row[2]), // ※実際はEntryとExitで別の行か、同じ行に追記するかによる
                    memberType: "会員", // 仮
                    registrationArea: "2 AREA", // 仮
                    // ... 必要なデータをマッピング
                });
            }
        }

        return createJSONOutput({ success: true, data: reportData });

    } catch (err) {
        return createJSONOutput({ success: false, message: err.toString() });
    }
}

// ==========================================
//  ユーティリティ関数
// ==========================================

function getSheet(spreadsheetId, sheetName) {
    let ss;
    if (spreadsheetId === "YOUR_SPREADSHEET_ID_HERE" || !spreadsheetId) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
    } else {
        ss = SpreadsheetApp.openById(spreadsheetId);
    }

    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' not found");
    return sheet;
}

function createJSONOutput(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function formatDate(date) {
    if (!date) return "";
    if (typeof date === 'string') return date;
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy/MM/dd");
}

function formatTime(date) {
    if (!date) return "";
    if (typeof date === 'string') return date;
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "HH:mm:ss");
}
