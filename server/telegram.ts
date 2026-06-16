import { storage } from "./storage";
import fs from "fs";
import path from "path";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : null;

// ----- State Machine for multi-step flows -----
interface UserState {
  state:
    | "idle"
    | "search_phone"
    | "reward_phone"
    | "reward_amount"
    | "ban_phone";
  data?: any;
}
const userStates = new Map<number, UserState>();

// ----- Types -----
interface OrderDetails {
  orderNumber: string;
  orderId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  gameName?: string;
  packageName?: string;
  playerId?: string | null;
  accountUsername?: string | null;
  loginType?: string | null;
  linkingMethod?: string | null;
  quantity?: number | null;
  paymentMethod: string;
  totalAmount: number;
  paymentProofUrl?: string | null;
  senderPhone?: string | null;
  notes?: string | null;
}

// ----- Helpers -----
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PERMANENT_CHAT_IDS = ["6602868710", "-1003753528902"];

async function getTelegramChatIds(): Promise<string[]> {
  const ids: string[] = [...PERMANENT_CHAT_IDS];
  try {
    const newSetting = await storage.getSetting("telegram_chat_ids");
    if (newSetting?.value) {
      try {
        const parsed = JSON.parse(newSetting.value);
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            const trimmed = String(id).trim();
            if (trimmed && !ids.includes(trimmed)) ids.push(trimmed);
          }
        } else if (typeof parsed === "string" && parsed.trim() && !ids.includes(parsed.trim())) {
          ids.push(parsed.trim());
        }
      } catch {
        if (newSetting.value.trim() && !ids.includes(newSetting.value.trim())) ids.push(newSetting.value.trim());
      }
    }
  } catch {}
  try {
    const old = await storage.getSetting("telegram_chat_id");
    if (old?.value?.trim() && !ids.includes(old.value.trim())) ids.push(old.value.trim());
  } catch {}
  return ids;
}

// ----- Low-level API -----
async function callTelegram(method: string, body: object): Promise<any> {
  if (!TELEGRAM_API) return null;
  try {
    const res = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch {
    return null;
  }
}

async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra?: object
): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_API) return { ok: false, error: "No bot token" };
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", ...extra };
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    if (data.ok) return { ok: true };

    // fallback to plain text
    const plainRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.replace(/<[^>]*>/g, ""), ...extra, parse_mode: undefined }),
    });
    const plainData = await plainRes.json() as any;
    return plainData.ok ? { ok: true } : { ok: false, error: plainData.description };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function editTelegramMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  extra?: object
): Promise<void> {
  if (!TELEGRAM_API) return;
  await callTelegram("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    ...extra,
  });
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!TELEGRAM_API) return;
  await callTelegram("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

async function sendTelegramPhotoUrl(chatId: string, photoUrl: string, caption: string, extra?: object): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_API) return { ok: false, error: "No bot token" };
  try {
    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML", ...extra }),
    });
    const data = await res.json() as any;
    return data.ok ? { ok: true } : { ok: false, error: data.description };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendTelegramPhotoFile(chatId: string, fileBuffer: Buffer, filename: string, caption: string, extra?: object): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_API) return { ok: false, error: "No bot token" };
  try {
    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", caption);
    formData.append("parse_mode", "HTML");
    formData.append("photo", new Blob([fileBuffer], { type: "image/jpeg" }), filename);
    if (extra) {
      for (const [k, v] of Object.entries(extra as any)) {
        if (typeof v === "string") formData.append(k, v);
        else formData.append(k, JSON.stringify(v));
      }
    }
    const res = await fetch(`${TELEGRAM_API}/sendPhoto`, { method: "POST", body: formData });
    const data = await res.json() as any;
    return data.ok ? { ok: true } : { ok: false, error: data.description };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function getLocalFileBuffer(proofUrl: string): Promise<{ buffer: Buffer; filename: string } | null> {
  const filename = proofUrl.replace("/uploads/", "");
  try {
    const localPath = path.resolve("uploads", filename);
    if (fs.existsSync(localPath)) {
      return { buffer: fs.readFileSync(localPath), filename };
    }
    const fileData = await storage.getUploadedFile(filename);
    if (fileData) return { buffer: Buffer.from(fileData.data, "base64"), filename };
  } catch {}
  return null;
}

// ----- Keyboard Builders -----
function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📊 إحصائيات اليوم", callback_data: "st_today" },
        { text: "📈 إحصائيات الأسبوع", callback_data: "st_week" },
      ],
      [
        { text: "🏆 أفضل العملاء", callback_data: "st_clients" },
        { text: "🎮 أكثر الألعاب مبيعاً", callback_data: "st_games" },
      ],
      [
        { text: "⏳ الطلبات المعلقة", callback_data: "ord_pending" },
        { text: "📋 آخر الطلبات", callback_data: "ord_recent" },
      ],
      [
        { text: "🔍 بحث عن عميل", callback_data: "cust_search" },
        { text: "💰 إضافة رصيد لعميل", callback_data: "cust_reward" },
      ],
      [
        { text: "🚫 حظر عميل", callback_data: "ban_customer" },
        { text: "📊 تقرير كامل الآن", callback_data: "full_report" },
      ],
    ],
  };
}

function backToMenuKeyboard() {
  return { inline_keyboard: [[{ text: "🏠 القائمة الرئيسية", callback_data: "mm" }]] };
}

// ----- Stats Functions -----
async function getDailyStats(): Promise<string> {
  const now = new Date();
  const cairoOffset = 2 * 60;
  const cairoNow = new Date(now.getTime() + cairoOffset * 60000);
  const todayStr = cairoNow.toISOString().split("T")[0];

  const allOrders = await storage.getOrders();
  const todayOrders = allOrders.filter((o) => {
    const created = new Date(o.createdAt || "").toISOString();
    return created.startsWith(todayStr);
  });

  const completed = todayOrders.filter((o) => o.status === "completed");
  const pending = todayOrders.filter((o) => o.status === "pending");
  const cancelled = todayOrders.filter((o) => o.status === "cancelled");
  const revenue = completed.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const gameCounts: Record<string, number> = {};
  for (const o of completed) {
    const name = (o as any).game?.name || "غير محدد";
    gameCounts[name] = (gameCounts[name] || 0) + 1;
  }
  const topGame = Object.entries(gameCounts).sort((a, b) => b[1] - a[1])[0];

  const lines = [
    `📊 <b>إحصائيات اليوم</b> - ${escapeHtml(todayStr)}`,
    "",
    `🛒 إجمالي الطلبات: <b>${todayOrders.length}</b>`,
    `✅ مكتملة: <b>${completed.length}</b>`,
    `⏳ معلقة: <b>${pending.length}</b>`,
    `❌ ملغية: <b>${cancelled.length}</b>`,
    `💰 الإيرادات: <b>${revenue} ج.م</b>`,
  ];
  if (topGame) lines.push(`🎮 أكثر لعبة: <b>${escapeHtml(topGame[0])}</b> (${topGame[1]} طلب)`);
  return lines.join("\n");
}

async function getWeeklyStats(): Promise<string> {
  const allOrders = await storage.getOrders();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekOrders = allOrders.filter((o) => new Date(o.createdAt || "") >= weekAgo);
  const completed = weekOrders.filter((o) => o.status === "completed");
  const pending = weekOrders.filter((o) => o.status === "pending");
  const revenue = completed.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const customers = await storage.getAllCustomers();
  const newCustomers = customers.filter((c) => new Date(c.createdAt || "") >= weekAgo);

  const gameCounts: Record<string, number> = {};
  for (const o of completed) {
    const name = (o as any).game?.name || "غير محدد";
    gameCounts[name] = (gameCounts[name] || 0) + 1;
  }
  const topGames = Object.entries(gameCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const prevWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevCompleted = allOrders.filter(
    (o) => o.status === "completed" && new Date(o.createdAt || "") >= prevWeekStart && new Date(o.createdAt || "") < weekAgo
  );
  const prevRevenue = prevCompleted.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const revenueChange = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;
  const changeEmoji = revenueChange > 0 ? "📈" : revenueChange < 0 ? "📉" : "➡️";

  const lines = [
    `📈 <b>إحصائيات آخر 7 أيام</b>`,
    "",
    `🛒 إجمالي الطلبات: <b>${weekOrders.length}</b>`,
    `✅ مكتملة: <b>${completed.length}</b>`,
    `⏳ معلقة: <b>${pending.length}</b>`,
    `💰 الإيرادات: <b>${revenue} ج.م</b>`,
    `${changeEmoji} مقارنة بالأسبوع الماضي: <b>${revenueChange > 0 ? "+" : ""}${revenueChange}%</b>`,
    `👤 عملاء جدد: <b>${newCustomers.length}</b>`,
  ];
  if (topGames.length > 0) {
    lines.push("", "🎮 <b>أكثر الألعاب مبيعاً:</b>");
    topGames.forEach(([name, count], i) =>
      lines.push(`  ${["🥇","🥈","🥉"][i]} ${escapeHtml(name)}: ${count} طلب`)
    );
  }
  return lines.join("\n");
}

async function getTopClients(): Promise<string> {
  const allOrders = await storage.getOrders();
  const completed = allOrders.filter((o) => o.status === "completed");

  const clientSpend: Record<string, { name: string; phone: string; total: number; count: number }> = {};
  for (const o of completed) {
    const phone = o.customerPhone || "unknown";
    if (!clientSpend[phone]) {
      clientSpend[phone] = { name: o.customerName || phone, phone, total: 0, count: 0 };
    }
    clientSpend[phone].total += Number(o.totalAmount) || 0;
    clientSpend[phone].count += 1;
  }

  const top = Object.values(clientSpend).sort((a, b) => b.total - a.total).slice(0, 10);

  const lines = [`🏆 <b>أفضل العملاء إنفاقاً</b>`, ""];
  if (top.length === 0) {
    lines.push("لا يوجد بيانات بعد");
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    top.forEach((c, i) => {
      const medal = medals[i] || `${i + 1}.`;
      lines.push(`${medal} <b>${escapeHtml(c.name)}</b>`);
      lines.push(`    💰 ${c.total} ج.م | 📦 ${c.count} طلب`);
    });
  }
  return lines.join("\n");
}

async function getTopGames(): Promise<string> {
  const allOrders = await storage.getOrders();
  const completed = allOrders.filter((o) => o.status === "completed");

  const gameCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const o of completed) {
    const name = (o as any).game?.name || "غير محدد";
    if (!gameCounts[name]) gameCounts[name] = { name, count: 0, revenue: 0 };
    gameCounts[name].count += 1;
    gameCounts[name].revenue += Number(o.totalAmount) || 0;
  }

  const top = Object.values(gameCounts).sort((a, b) => b.count - a.count).slice(0, 8);
  const lines = [`🎮 <b>أكثر الألعاب مبيعاً</b>`, ""];
  if (top.length === 0) {
    lines.push("لا يوجد بيانات بعد");
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    top.forEach((g, i) => {
      const medal = medals[i] || `${i + 1}.`;
      lines.push(`${medal} <b>${escapeHtml(g.name)}</b>`);
      lines.push(`    📦 ${g.count} طلب | 💰 ${g.revenue} ج.م`);
    });
  }
  return lines.join("\n");
}

async function getPendingOrders(): Promise<string> {
  const allOrders = await storage.getOrders();
  const pending = allOrders.filter((o) => o.status === "pending").slice(0, 10);

  if (pending.length === 0) return "⏳ <b>لا يوجد طلبات معلقة</b> 🎉";

  const lines = [`⏳ <b>الطلبات المعلقة (${pending.length})</b>`, ""];
  for (const o of pending) {
    const game = (o as any).game?.name || "غير محدد";
    const pkg = (o as any).package?.name || "";
    const created = new Date(o.createdAt || "").toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
    lines.push(`🔸 <b>${escapeHtml(o.orderNumber)}</b>`);
    lines.push(`  👤 ${escapeHtml(o.customerName || "")} | 🎮 ${escapeHtml(game)}`);
    if (pkg) lines.push(`  📦 ${escapeHtml(pkg)}`);
    lines.push(`  💰 ${o.totalAmount} ج.م | ⏰ ${escapeHtml(created)}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function getRecentOrders(): Promise<string> {
  const allOrders = await storage.getOrders();
  const recent = allOrders
    .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
    .slice(0, 8);

  if (recent.length === 0) return "📋 <b>لا يوجد طلبات بعد</b>";

  const statusMap: Record<string, string> = {
    pending: "⏳",
    processing: "🔄",
    completed: "✅",
    cancelled: "❌",
  };

  const lines = [`📋 <b>آخر 8 طلبات</b>`, ""];
  for (const o of recent) {
    const game = (o as any).game?.name || "غير محدد";
    const icon = statusMap[o.status] || "📦";
    lines.push(`${icon} <b>${escapeHtml(o.orderNumber)}</b> - ${escapeHtml(o.customerName || "")}`);
    lines.push(`  🎮 ${escapeHtml(game)} | 💰 ${o.totalAmount} ج.م`);
  }
  return lines.join("\n");
}

async function getCustomerInfo(phone: string): Promise<{ text: string; keyboard?: any }> {
  const customer = await storage.getCustomerByPhone(phone.replace(/^0/, "+20").replace(/^\+/, ""));

  // Try different phone formats
  const formats = [
    phone,
    phone.replace(/^0/, "+20"),
    phone.replace(/^00/, "+"),
    "0" + phone.replace(/^\+20/, ""),
  ];

  let found = null;
  for (const fmt of formats) {
    const c = await storage.getCustomerByPhone(fmt);
    if (c) { found = c; break; }
  }

  if (!found) {
    // Try by username too
    found = await storage.getCustomerByUsername(phone) || null;
  }

  if (!found) {
    return {
      text: `❌ <b>لم يُعثر على عميل بهذا الرقم أو الاسم:</b> ${escapeHtml(phone)}`,
      keyboard: backToMenuKeyboard(),
    };
  }

  const orders = await storage.getOrdersByPhone(found.phone || "");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalSpent = completedOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
  const isBannedVal = (found as any).isBanned;
  const banStatus = isBannedVal ? "🚫 محظور" : "✅ نشط";
  const banReason = (found as any).banReason;
  const bannedAt = (found as any).bannedAt;

  const infoLines = [
    `👤 <b>معلومات العميل</b>`,
    "",
    `📛 الاسم: <b>${escapeHtml(found.name || "")}</b>`,
    `🔑 اسم المستخدم: <code>${escapeHtml(found.username || "")}</code>`,
    `📱 الهاتف: <code>${escapeHtml(found.phone || "")}</code>`,
    `💳 الرصيد: <b>${found.balance || 0} ج.م</b>`,
    `⭐ نقاط الولاء: <b>${found.loyaltyPoints || 0}</b>`,
    `📦 الطلبات: <b>${orders.length}</b> (${completedOrders.length} مكتمل)`,
    `💰 إجمالي الإنفاق: <b>${totalSpent} ج.م</b>`,
    `🔒 الحالة: ${banStatus}`,
  ];
  if (isBannedVal && banReason) infoLines.push(`📝 سبب الحظر: ${escapeHtml(banReason)}`);
  if (isBannedVal && bannedAt) infoLines.push(`📅 تاريخ الحظر: ${new Date(bannedAt).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" })}`);
  const text = infoLines.join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "💰 إضافة رصيد", callback_data: `cust_rwd:${found.id}` },
        isBannedVal
          ? { text: "✅ رفع الحظر", callback_data: `cust_unban:${found.id}` }
          : { text: "🚫 حظر", callback_data: `cust_ban:${found.id}` },
      ],
      [{ text: "🏠 القائمة الرئيسية", callback_data: "mm" }],
    ],
  };

  return { text, keyboard };
}

async function getFullReport(): Promise<string> {
  const stats = await storage.getOrderStats();
  const custStats = await storage.getCustomerStats();
  const allOrders = await storage.getOrders();

  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekOrders = allOrders.filter((o) => new Date(o.createdAt || "") >= weekAgo);
  const weekRevenue = weekOrders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  const totalRevenue = allOrders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);

  return [
    `📊 <b>تقرير Astro الكامل</b>`,
    `⏰ ${escapeHtml(now)}`,
    "",
    `<b>📦 الطلبات:</b>`,
    `  إجمالي: ${stats.totalOrders} | اليوم: ${stats.todayOrders}`,
    `  مكتملة: ${stats.completedOrders} | معلقة: ${stats.pendingOrders}`,
    "",
    `<b>💰 الإيرادات:</b>`,
    `  الإجمالي: ${totalRevenue} ج.م`,
    `  هذا الأسبوع: ${weekRevenue} ج.م`,
    "",
    `<b>👥 العملاء:</b>`,
    `  المسجلين: ${custStats.totalCustomers}`,
    `  إجمالي الأرصدة: ${custStats.totalBalance} ج.م`,
  ].join("\n");
}

// ----- Order Message Builder -----
function buildOrderMessage(details: OrderDetails & { _rawMessage?: string }): string {
  if ((details as any)._rawMessage) return (details as any)._rawMessage;
  const lines: string[] = [];
  lines.push("<b>🛒 طلب جديد</b>");
  lines.push("");
  lines.push(`📋 <b>رقم الطلب:</b> <code>${escapeHtml(details.orderNumber)}</code>`);
  lines.push(`👤 <b>الاسم:</b> ${escapeHtml(details.customerName)}`);
  lines.push(`📱 <b>الهاتف:</b> ${escapeHtml(details.customerPhone)}`);
  if (details.customerEmail) lines.push(`📧 <b>الإيميل:</b> ${escapeHtml(details.customerEmail)}`);
  if (details.gameName) lines.push(`🎮 <b>اللعبة:</b> ${escapeHtml(details.gameName)}`);
  if (details.packageName) lines.push(`📦 <b>الباقة:</b> ${escapeHtml(details.packageName)}`);
  if (details.accountUsername) lines.push(`👤 <b>اسم المستخدم:</b> <code>${escapeHtml(details.accountUsername)}</code>`);
  if (details.playerId) {
    const label = details.loginType === "account" ? "كلمة المرور" : "Player ID";
    lines.push(`🆔 <b>${label}:</b> <code>${escapeHtml(details.playerId)}</code>`);
  }
  if (details.linkingMethod) lines.push(`🔗 <b>طريقة الربط:</b> ${escapeHtml(details.linkingMethod)}`);
  if (details.quantity && details.quantity > 1) lines.push(`📊 <b>الكمية:</b> ${details.quantity}`);
  lines.push(`💳 <b>طريقة الدفع:</b> ${escapeHtml(details.paymentMethod)}`);
  lines.push(`💰 <b>المبلغ:</b> ${details.totalAmount} ج.م`);
  if (details.senderPhone) lines.push(`📞 <b>رقم المحول منه:</b> ${escapeHtml(details.senderPhone)}`);
  if (details.notes) lines.push(`📝 <b>ملاحظات:</b> ${escapeHtml(details.notes)}`);
  if (details.paymentProofUrl) lines.push(`🖼 <b>إثبات الدفع:</b> مرفق`);
  lines.push("");
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  lines.push(`⏰ <b>التاريخ:</b> ${escapeHtml(now)}`);
  return lines.join("\n");
}

function buildOrderKeyboard(orderId?: string) {
  if (!orderId) return undefined;
  return {
    inline_keyboard: [
      [
        { text: "✅ قبول الطلب", callback_data: `ord_ok:${orderId}` },
        { text: "❌ رفض الطلب", callback_data: `ord_rej:${orderId}` },
      ],
    ],
  };
}

// ----- Sell Request Notification -----
export async function sendSellRequestToTelegram(sellRequest: any): Promise<void> {
  const chatIds = await getTelegramChatIds();
  const gameName = sellRequest.gameType || sellRequest.game?.nameAr || "غير محدد";
  const linkingMap: Record<string, string> = {
    email: "إيميل",
    facebook: "فيسبوك",
    google: "جوجل",
    phone: "رقم هاتف",
    apple: "Apple ID",
    other: "أخرى",
  };
  const linkingLabel = linkingMap[sellRequest.linkingMethod] || sellRequest.linkingMethod;
  const sellerReceives = Math.floor(sellRequest.requestedPrice * 0.96);
  const buyerPays = Math.ceil(sellRequest.requestedPrice * 1.04);

  const text = [
    `🏷 <b>طلب بيع حساب جديد</b>`,
    ``,
    `👤 <b>البائع:</b> ${escapeHtml(sellRequest.sellerName)}`,
    `📱 <b>واتساب:</b> <code>${escapeHtml(sellRequest.sellerPhone)}</code>`,
    `🎮 <b>اللعبة:</b> ${escapeHtml(gameName)}`,
    `📝 <b>العنوان:</b> ${escapeHtml(sellRequest.title)}`,
    `📋 <b>الوصف:</b> ${escapeHtml(sellRequest.description)}`,
    `🔗 <b>نوع الربط:</b> ${escapeHtml(linkingLabel)}`,
    ``,
    `💰 <b>السعر المطلوب:</b> ${sellRequest.requestedPrice} ج`,
    `💵 <b>سعر البيع للمشتري:</b> ${buyerPays} ج`,
    `💸 <b>يصل للبائع:</b> ${sellerReceives} ج`,
    `🖼 <b>عدد الصور:</b> ${(sellRequest.images || []).length}`,
    ``,
    `⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
  ].join("\n");

  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ قبول الطلب", callback_data: `sell_ok:${sellRequest.id}` },
        { text: "❌ رفض الطلب", callback_data: `sell_rej:${sellRequest.id}` },
      ],
    ],
  };

  for (const chatId of chatIds) {
    if (sellRequest.images && sellRequest.images.length > 0) {
      await sendTelegramPhotoUrl(chatId, sellRequest.images[0], text, { reply_markup: keyboard });
    } else {
      await sendTelegramMessage(chatId, text, { reply_markup: keyboard });
    }
  }
}

// ----- Main Menu -----
async function sendMainMenu(chatId: number | string) {
  userStates.set(Number(chatId), { state: "idle" });
  await sendTelegramMessage(
    chatId,
    "🎮 <b>مرحباً في لوحة تحكم Astro</b>\n\nاختر من القائمة:",
    { reply_markup: mainMenuKeyboard() }
  );
}

// ----- Callback Query Handler -----
async function handleCallbackQuery(query: any) {
  const chatId = query.message?.chat?.id;
  const msgId = query.message?.message_id;
  const data = query.data as string;

  if (!chatId || !data) return;
  await answerCallbackQuery(query.id);

  if (data === "mm") {
    await sendMainMenu(chatId);
    return;
  }

  if (data === "st_today") {
    const text = await getDailyStats();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "st_week") {
    const text = await getWeeklyStats();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "st_clients") {
    const text = await getTopClients();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "st_games") {
    const text = await getTopGames();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "ord_pending") {
    const text = await getPendingOrders();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "ord_recent") {
    const text = await getRecentOrders();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  if (data === "cust_search") {
    userStates.set(chatId, { state: "search_phone" });
    await editTelegramMessage(
      chatId,
      msgId,
      "🔍 <b>بحث عن عميل</b>\n\nاكتب رقم هاتف العميل أو اسم المستخدم:",
      { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] } }
    );
    return;
  }

  if (data === "cust_reward") {
    userStates.set(chatId, { state: "reward_phone" });
    await editTelegramMessage(
      chatId,
      msgId,
      "💰 <b>إضافة رصيد لعميل</b>\n\nاكتب رقم هاتف العميل:",
      { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] } }
    );
    return;
  }

  if (data === "ban_customer") {
    userStates.set(chatId, { state: "ban_phone" });
    await editTelegramMessage(
      chatId,
      msgId,
      "🚫 <b>حظر عميل</b>\n\nاكتب رقم هاتف العميل:",
      { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] } }
    );
    return;
  }

  if (data === "full_report") {
    const text = await getFullReport();
    await editTelegramMessage(chatId, msgId, text, { reply_markup: backToMenuKeyboard() });
    return;
  }

  // Order accept/reject
  if (data.startsWith("ord_ok:") || data.startsWith("ord_rej:")) {
    const [action, orderId] = data.split(":");
    const newStatus = action === "ord_ok" ? "completed" : "cancelled";
    const order = await storage.getOrderById(orderId);
    if (!order) {
      await answerCallbackQuery(query.id, "❌ الطلب غير موجود");
      return;
    }
    await storage.updateOrderStatus(orderId, newStatus);
    const statusText = newStatus === "completed" ? "✅ تم قبول الطلب" : "❌ تم رفض الطلب";
    // Answer callback query first (shows toast in Telegram)
    await answerCallbackQuery(query.id, statusText);
    // Edit message or caption (handle both text and photo messages)
    const existingText = query.message?.text || query.message?.caption || "";
    const newText = existingText + `\n\n<b>${statusText}</b> بواسطة الأدمن`;
    if (query.message?.caption !== undefined) {
      await callTelegram("editMessageCaption", {
        chat_id: chatId,
        message_id: msgId,
        caption: newText,
        parse_mode: "HTML",
      });
    } else {
      await editTelegramMessage(chatId, msgId, newText, {});
    }
    return;
  }

  // Sell request approve/reject
  if (data.startsWith("sell_ok:") || data.startsWith("sell_rej:")) {
    const [action, sellReqId] = data.split(":");
    const isApprove = action === "sell_ok";
    const sellRequest = await storage.getAccountSellRequestById(sellReqId);
    if (!sellRequest) {
      await answerCallbackQuery(query.id, "❌ الطلب غير موجود");
      return;
    }
    if (sellRequest.status !== "pending") {
      await answerCallbackQuery(query.id, `⚠️ الطلب ${sellRequest.status === "approved" ? "مقبول" : "مرفوض"} مسبقاً`);
      return;
    }
    if (isApprove) {
      const sellerPrice = sellRequest.requestedPrice;
      const buyerPrice = Math.ceil(sellerPrice * 1.04);
      const sellerReceives = Math.floor(sellerPrice * 0.96);
      const account = await storage.createAccount({
        gameId: sellRequest.gameId || null,
        gameType: sellRequest.gameType,
        title: sellRequest.title,
        description: sellRequest.description,
        price: buyerPrice,
        sellerPrice: sellerReceives,
        sellerName: sellRequest.sellerName,
        sellerPhone: sellRequest.sellerPhone,
        linkingMethod: sellRequest.linkingMethod,
        images: sellRequest.images,
        source: "seller_request",
        sellRequestId: sellRequest.id,
        isActive: true,
        isSold: false,
      });
      await storage.updateAccountSellRequestStatus(sellReqId, "approved", undefined, account.id);
      const msgText = (query.message?.caption || query.message?.text || "") + `\n\n✅ <b>تم قبول الطلب وإضافة الحساب للمتجر</b>`;
      if (query.message?.caption) {
        await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: msgText, parse_mode: "HTML" });
      } else {
        await editTelegramMessage(chatId, msgId, msgText, {});
      }
    } else {
      await storage.updateAccountSellRequestStatus(sellReqId, "rejected");
      const msgText = (query.message?.caption || query.message?.text || "") + `\n\n❌ <b>تم رفض الطلب</b>`;
      if (query.message?.caption) {
        await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: msgText, parse_mode: "HTML" });
      } else {
        await editTelegramMessage(chatId, msgId, msgText, {});
      }
    }
    return;
  }

  // Wallet request approve/reject from Telegram
  if (data.startsWith("wlt_ok:") || data.startsWith("wlt_rej:")) {
    const [action, walletId] = data.split(":");
    const isApprove = action === "wlt_ok";
    try {
      const walletReq = await storage.getWalletRequestById(walletId);
      if (!walletReq) {
        await answerCallbackQuery(query.id, "❌ الطلب غير موجود");
        return;
      }
      if (walletReq.status !== "pending") {
        await answerCallbackQuery(query.id, `⚠️ الطلب ${walletReq.status === "approved" ? "مقبول" : "مرفوض"} مسبقاً`);
        return;
      }
      await storage.updateWalletRequestStatus(walletId, isApprove ? "approved" : "rejected");
      if (isApprove) {
        await storage.createWalletTransaction({
          customerId: walletReq.customerId,
          type: "credit",
          amount: walletReq.amount,
          reason: "إيداع محفظة - تمت الموافقة",
        });
        await storage.createCustomerInboxMessage({
          customerPhone: walletReq.customerPhone,
          customerId: walletReq.customerId,
          title: "💰 تم قبول طلب الإيداع",
          message: `تم إضافة ${walletReq.amount} جنيه إلى محفظتك بنجاح.`,
        });
      } else {
        await storage.createCustomerInboxMessage({
          customerPhone: walletReq.customerPhone,
          customerId: walletReq.customerId,
          title: "❌ تم رفض طلب الإيداع",
          message: `تم رفض طلب إيداع ${walletReq.amount} جنيه.`,
        });
      }
      const statusText = isApprove ? "✅ تم قبول طلب الشحن وإضافة الرصيد" : "❌ تم رفض طلب الشحن";
      const prevText = query.message?.caption || query.message?.text || "";
      const newText = prevText + `\n\n<b>${statusText}</b>`;
      if (query.message?.caption) {
        await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: newText, parse_mode: "HTML" });
      } else {
        await editTelegramMessage(chatId, msgId, newText, {});
      }
    } catch (e) {
      await answerCallbackQuery(query.id, "❌ حدث خطأ");
    }
    return;
  }

  // Sardarb order approve/reject
  if (data.startsWith("sardarb_ok:") || data.startsWith("sardarb_rej:")) {
    const [action, orderId] = data.split(":");
    const isApprove = action === "sardarb_ok";
    const order = await storage.getSardarbOrderById(orderId);
    if (!order) { await answerCallbackQuery(query.id, "❌ الطلب غير موجود"); return; }
    if (order.status !== "pending") { await answerCallbackQuery(query.id, "⚠️ تم معالجة الطلب مسبقاً"); return; }
    await storage.updateSardarbOrder(orderId, { status: isApprove ? "confirmed" : "cancelled" });
    const statusText = isApprove ? "✅ تم قبول طلب السرداب" : "❌ تم رفض طلب السرداب";
    await answerCallbackQuery(query.id, statusText);
    const prevText = query.message?.caption || query.message?.text || "";
    const newText = prevText + `\n\n<b>${statusText}</b>`;
    if (query.message?.caption !== undefined) {
      await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: newText, parse_mode: "HTML" });
    } else {
      await editTelegramMessage(chatId, msgId, newText, {});
    }
    return;
  }

  // Virtual Number order approve/reject
  if (data.startsWith("vn_ok:") || data.startsWith("vn_rej:")) {
    const [action, orderId] = data.split(":");
    const isApprove = action === "vn_ok";
    const order = await storage.getVirtualNumberOrderById(orderId);
    if (!order) { await answerCallbackQuery(query.id, "❌ الطلب غير موجود"); return; }
    if (order.status !== "pending_payment") { await answerCallbackQuery(query.id, "⚠️ تم معالجة الطلب مسبقاً"); return; }
    await storage.updateVirtualNumberOrder(orderId, { status: isApprove ? "confirmed" : "cancelled" });
    const statusText = isApprove ? "✅ تم تأكيد الدفع - انتظر الرقم الفيك" : "❌ تم رفض طلب الرقم الفيك";
    await answerCallbackQuery(query.id, statusText);
    const prevText = query.message?.caption || query.message?.text || "";
    const newText = prevText + `\n\n<b>${statusText}</b>`;
    if (query.message?.caption !== undefined) {
      await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: newText, parse_mode: "HTML" });
    } else {
      await editTelegramMessage(chatId, msgId, newText, {});
    }
    return;
  }

  // Broker request approve/reject
  if (data.startsWith("broker_ok:") || data.startsWith("broker_rej:")) {
    const [action, reqId] = data.split(":");
    const isApprove = action === "broker_ok";
    const req = await storage.getBrokerRequestById(reqId);
    if (!req) { await answerCallbackQuery(query.id, "❌ الطلب غير موجود"); return; }
    if (req.status !== "pending") { await answerCallbackQuery(query.id, "⚠️ تم معالجة الطلب مسبقاً"); return; }
    await storage.updateBrokerRequest(reqId, { status: isApprove ? "approved" : "cancelled" });
    const statusText = isApprove ? "✅ تم اعتماد الطلب الخاص - سيبدأ البحث عن بائع" : "❌ تم رفض الطلب الخاص";
    await answerCallbackQuery(query.id, statusText);
    const prevText = query.message?.caption || query.message?.text || "";
    const newText = prevText + `\n\n<b>${statusText}</b>`;
    if (query.message?.caption !== undefined) {
      await callTelegram("editMessageCaption", { chat_id: chatId, message_id: msgId, caption: newText, parse_mode: "HTML" });
    } else {
      await editTelegramMessage(chatId, msgId, newText, {});
    }
    return;
  }

  // Customer info from callback
  if (data.startsWith("cust_info:")) {
    const customerId = data.split(":")[1];
    const customer = await storage.getCustomerById(customerId);
    if (!customer) {
      await sendTelegramMessage(chatId, "❌ العميل غير موجود", { reply_markup: backToMenuKeyboard() });
      return;
    }
    const { text, keyboard } = await getCustomerInfo(customer.phone || customer.username || "");
    await editTelegramMessage(chatId, msgId, text, { reply_markup: keyboard });
    return;
  }

  // Reward customer (direct from customer info button)
  if (data.startsWith("cust_rwd:")) {
    const customerId = data.split(":")[1];
    userStates.set(chatId, { state: "reward_amount", data: { customerId } });
    const customer = await storage.getCustomerById(customerId);
    await editTelegramMessage(
      chatId,
      msgId,
      `💰 <b>إضافة رصيد</b>\n\nالعميل: <b>${escapeHtml(customer?.name || "")}</b>\n\nاكتب المبلغ المراد إضافته:`,
      { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] } }
    );
    return;
  }

  // Ban customer
  if (data.startsWith("cust_ban:")) {
    const customerId = data.split(":")[1];
    const customer = await storage.getCustomerById(customerId);
    if (!customer) return;
    await storage.updateCustomer(customerId, { isBanned: true } as any);
    await storage.deleteCustomerSessionsByCustomerId(customerId);
    await editTelegramMessage(
      chatId,
      msgId,
      `🚫 <b>تم حظر العميل</b>\n\n${escapeHtml(customer.name || customer.username || "")} تم حظره بنجاح`,
      { reply_markup: backToMenuKeyboard() }
    );
    return;
  }

  // Unban customer
  if (data.startsWith("cust_unban:")) {
    const customerId = data.split(":")[1];
    const customer = await storage.getCustomerById(customerId);
    if (!customer) return;
    await storage.updateCustomer(customerId, { isBanned: false } as any);
    await editTelegramMessage(
      chatId,
      msgId,
      `✅ <b>تم رفع الحظر</b>\n\n${escapeHtml(customer.name || customer.username || "")} تم رفع حظره بنجاح`,
      { reply_markup: backToMenuKeyboard() }
    );
    return;
  }
}

// ----- Message Handler -----
async function handleMessage(msg: any) {
  const chatId = msg.chat?.id;
  const text = (msg.text || "").trim();

  if (!chatId || !text) return;

  // /start or /menu
  if (text === "/start" || text === "/menu" || text === "menu") {
    await sendMainMenu(chatId);
    return;
  }

  const state = userStates.get(chatId) || { state: "idle" };

  // Search customer state
  if (state.state === "search_phone") {
    userStates.set(chatId, { state: "idle" });
    const { text: infoText, keyboard } = await getCustomerInfo(text);
    await sendTelegramMessage(chatId, infoText, { reply_markup: keyboard });
    return;
  }

  // Reward phone state
  if (state.state === "reward_phone") {
    // Look up customer first
    const formats = [text, text.replace(/^0/, "+20"), "0" + text.replace(/^\+20/, "")];
    let customer = null;
    for (const fmt of formats) {
      const c = await storage.getCustomerByPhone(fmt);
      if (c) { customer = c; break; }
    }
    if (!customer) customer = await storage.getCustomerByUsername(text) || null;

    if (!customer) {
      userStates.set(chatId, { state: "idle" });
      await sendTelegramMessage(chatId, `❌ لم يُعثر على عميل: ${escapeHtml(text)}`, { reply_markup: backToMenuKeyboard() });
      return;
    }

    userStates.set(chatId, { state: "reward_amount", data: { customerId: customer.id } });
    await sendTelegramMessage(
      chatId,
      `✅ <b>تم العثور على:</b> ${escapeHtml(customer.name || customer.username || "")}\n\nالرصيد الحالي: ${customer.balance || 0} ج.م\n\nاكتب المبلغ المراد إضافته:`,
      { reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] } }
    );
    return;
  }

  // Reward amount state
  if (state.state === "reward_amount") {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount <= 0) {
      await sendTelegramMessage(chatId, "❌ أدخل رقماً صحيحاً أكبر من صفر:", {
        reply_markup: { inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "mm" }]] },
      });
      return;
    }

    const customerId = state.data?.customerId;
    const customer = await storage.getCustomerById(customerId);
    if (!customer) {
      userStates.set(chatId, { state: "idle" });
      await sendMainMenu(chatId);
      return;
    }

    const newBalance = (Number(customer.balance) || 0) + amount;
    await storage.updateCustomer(customerId, { balance: newBalance } as any);
    await storage.createWalletTransaction({
      customerId,
      type: "credit",
      amount,
      reason: "مكافأة من الأدمن عبر البوت",
      balanceBefore: Number(customer.balance) || 0,
      balanceAfter: newBalance,
    });

    userStates.set(chatId, { state: "idle" });
    await sendTelegramMessage(
      chatId,
      `✅ <b>تم إضافة الرصيد بنجاح</b>\n\n👤 العميل: ${escapeHtml(customer.name || "")}\n💰 المبلغ المضاف: ${amount} ج.م\n💳 الرصيد الجديد: ${newBalance} ج.م`,
      { reply_markup: backToMenuKeyboard() }
    );
    return;
  }

  // Ban phone state
  if (state.state === "ban_phone") {
    const formats = [text, text.replace(/^0/, "+20"), "0" + text.replace(/^\+20/, "")];
    let customer = null;
    for (const fmt of formats) {
      const c = await storage.getCustomerByPhone(fmt);
      if (c) { customer = c; break; }
    }
    if (!customer) customer = await storage.getCustomerByUsername(text) || null;

    userStates.set(chatId, { state: "idle" });

    if (!customer) {
      await sendTelegramMessage(chatId, `❌ لم يُعثر على عميل: ${escapeHtml(text)}`, { reply_markup: backToMenuKeyboard() });
      return;
    }

    const isBanned = (customer as any).isBanned;
    const keyboard = {
      inline_keyboard: [
        [
          isBanned
            ? { text: "✅ رفع الحظر", callback_data: `cust_unban:${customer.id}` }
            : { text: "🚫 تأكيد الحظر", callback_data: `cust_ban:${customer.id}` },
          { text: "🏠 القائمة الرئيسية", callback_data: "mm" },
        ],
      ],
    };
    const status = isBanned ? "🚫 محظور حالياً" : "✅ نشط";
    await sendTelegramMessage(
      chatId,
      `👤 <b>${escapeHtml(customer.name || customer.username || "")}</b>\n📱 ${escapeHtml(customer.phone || "")}\n🔒 الحالة: ${status}\n\nماذا تريد أن تفعل؟`,
      { reply_markup: keyboard }
    );
    return;
  }

  // Default: show menu
  await sendMainMenu(chatId);
}

// ----- Update Dispatcher -----
async function handleUpdate(update: any) {
  try {
    const senderId = update.callback_query?.from?.id ?? update.message?.from?.id;
    const chatId = update.callback_query?.message?.chat?.id ?? update.message?.chat?.id;
    if (!senderId) return;

    const adminIds = await getTelegramChatIds();

    // Always require at least one configured admin ID — if none set, reject all
    if (adminIds.length === 0) return;

    // Allow if sender's personal ID matches, OR the chat ID matches (group support)
    const isAuthorized = adminIds.some(
      (id) => String(id) === String(senderId) || String(id) === String(chatId)
    );
    if (!isAuthorized) return;

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error("[Bot] Error handling update:", err);
  }
}

// ----- Long Polling Loop -----
let pollingOffset = 0;
let pollingActive = false;

export async function startTelegramPolling() {
  if (!TELEGRAM_API) {
    console.log("[Bot] No TELEGRAM_BOT_TOKEN, polling disabled");
    return;
  }
  if (pollingActive) return;
  pollingActive = true;
  console.log("[Bot] Starting long polling...");

  const poll = async () => {
    if (!pollingActive) return;
    try {
      const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${pollingOffset}&timeout=25&allowed_updates=["message","callback_query"]`, {
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 3000));
        if (pollingActive) setTimeout(poll, 0);
        return;
      }
      const data = await res.json() as any;
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          pollingOffset = update.update_id + 1;
          handleUpdate(update).catch(() => {});
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError" && err.name !== "TimeoutError") {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (pollingActive) setTimeout(poll, 0);
  };

  setTimeout(poll, 1000);
}

export function stopTelegramPolling() {
  pollingActive = false;
}

// ----- Daily Report Scheduler -----
let lastReportDay = -1;

async function checkDailyReport() {
  const now = new Date();
  const cairoOffset = 2;
  const cairoHour = (now.getUTCHours() + cairoOffset) % 24;
  const cairoDay = now.getUTCDate();

  // Send at 11 PM Cairo time
  if (cairoHour === 23 && cairoDay !== lastReportDay) {
    lastReportDay = cairoDay;
    try {
      const chatIds = await getTelegramChatIds();
      if (chatIds.length === 0) return;

      const daily = await getDailyStats();
      const report = `🌙 <b>التقرير اليومي - نهاية اليوم</b>\n\n${daily}`;

      for (const chatId of chatIds) {
        await sendTelegramMessage(chatId, report, { reply_markup: backToMenuKeyboard() });
      }
      console.log("[Bot] Daily report sent");
    } catch (err) {
      console.error("[Bot] Daily report error:", err);
    }
  }
}

export function startDailyReportScheduler() {
  setInterval(checkDailyReport, 60 * 1000);
}

// ----- Broadcast to all configured chats -----
async function broadcastToAdmins(text: string, extra?: object) {
  const chatIds = await getTelegramChatIds();
  await Promise.all(chatIds.map((id) => sendTelegramMessage(id, text, extra)));
}

// ----- Public Exports -----
export async function sendOrderToTelegram(details: OrderDetails): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_API) return false;

  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return false;

  // Resolve payment method Arabic name
  let resolvedPaymentMethod = details.paymentMethod;
  try {
    const allMethods = await storage.getPaymentMethods();
    const found = allMethods.find(
      (m) => m.name === details.paymentMethod || m.nameAr === details.paymentMethod
    );
    if (found) resolvedPaymentMethod = found.nameAr;
  } catch {}

  const message = buildOrderMessage({ ...details, paymentMethod: resolvedPaymentMethod });
  const keyboard = details.orderId ? buildOrderKeyboard(details.orderId) : undefined;
  const extra = keyboard ? { reply_markup: keyboard } : undefined;

  let localFile: { buffer: Buffer; filename: string } | null = null;
  if (details.paymentProofUrl?.startsWith("/uploads/")) {
    localFile = await getLocalFileBuffer(details.paymentProofUrl);
  }

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        if (details.paymentProofUrl) {
          if (details.paymentProofUrl.startsWith("http")) {
            const r = await sendTelegramPhotoUrl(chatId, details.paymentProofUrl, message, extra);
            if (r.ok) return true;
          } else if (localFile) {
            const r = await sendTelegramPhotoFile(chatId, localFile.buffer, localFile.filename, message, extra);
            if (r.ok) return true;
          }
        }
        const r = await sendTelegramMessage(chatId, message, extra);
        return r.ok;
      } catch {
        return false;
      }
    })
  );

  return results.some(Boolean);
}

export async function sendSardarbOrderToTelegram(order: any): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return;
  let paymentName = order.paymentMethod;
  try {
    const allMethods = await storage.getPaymentMethods();
    const found = allMethods.find((m) => m.name === order.paymentMethod || m.nameAr === order.paymentMethod);
    if (found) paymentName = found.nameAr;
  } catch {}
  const lines = [
    `🛒 <b>طلب سرداب جديد</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(order.orderNumber || order.id)}</code>`,
    ``,
    `🎁 <b>المنتج:</b> ${escapeHtml(order.item?.title || order.itemId || "—")}`,
    `📦 <b>الفئة:</b> ${escapeHtml(order.item?.category || "—")}`,
    `💰 <b>المبلغ:</b> ${order.totalAmount} ج.م`,
    ``,
    `👤 <b>العميل:</b> ${escapeHtml(order.customerName)}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(order.customerPhone)}</code>`,
    ``,
    `💳 <b>طريقة الدفع:</b> ${escapeHtml(paymentName)}`,
    order.senderPhone ? `📞 <b>رقم المحول منه:</b> ${escapeHtml(order.senderPhone)}` : null,
    order.paymentProofUrl ? `🖼 <b>إثبات الدفع:</b> مرفق` : null,
    ``,
    `⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
  ].filter(Boolean).join("\n");

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ قبول الطلب", callback_data: `sardarb_ok:${order.id}` },
      { text: "❌ رفض الطلب", callback_data: `sardarb_rej:${order.id}` },
    ]],
  };
  for (const chatId of chatIds) {
    if (order.paymentProofUrl) {
      const ok = await sendTelegramPhotoUrl(chatId, order.paymentProofUrl, lines, { reply_markup: keyboard });
      if (ok.ok) continue;
    }
    await sendTelegramMessage(chatId, lines, { reply_markup: keyboard });
  }
}

export async function sendVirtualNumberOrderToTelegram(order: any): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return;
  let paymentName = order.paymentMethod;
  try {
    const allMethods = await storage.getPaymentMethods();
    const found = allMethods.find((m) => m.name === order.paymentMethod || m.nameAr === order.paymentMethod);
    if (found) paymentName = found.nameAr;
  } catch {}
  const lines = [
    `📱 <b>طلب رقم فيك جديد</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(order.orderNumber || order.id)}</code>`,
    ``,
    `🌍 <b>الدولة:</b> ${escapeHtml(order.country?.countryFlag || "")} ${escapeHtml(order.country?.countryName || order.countryId || "—")}`,
    order.country?.countryCode ? `🔢 <b>كود الدولة:</b> ${escapeHtml(order.country.countryCode)}` : null,
    `💰 <b>المبلغ:</b> ${order.totalAmount} ج.م`,
    ``,
    `👤 <b>العميل:</b> ${escapeHtml(order.customerName)}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(order.customerPhone)}</code>`,
    ``,
    `💳 <b>طريقة الدفع:</b> ${escapeHtml(paymentName)}`,
    order.senderPhone ? `📞 <b>رقم المحول منه:</b> ${escapeHtml(order.senderPhone)}` : null,
    order.paymentProofUrl ? `🖼 <b>إثبات الدفع:</b> مرفق` : null,
    ``,
    `⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
  ].filter(Boolean).join("\n");

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ تأكيد الدفع", callback_data: `vn_ok:${order.id}` },
      { text: "❌ رفض الطلب", callback_data: `vn_rej:${order.id}` },
    ]],
  };
  for (const chatId of chatIds) {
    if (order.paymentProofUrl) {
      const ok = await sendTelegramPhotoUrl(chatId, order.paymentProofUrl, lines, { reply_markup: keyboard });
      if (ok.ok) continue;
    }
    await sendTelegramMessage(chatId, lines, { reply_markup: keyboard });
  }
}

export async function sendBrokerRequestToTelegram(req: any): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return;
  let paymentName = req.paymentMethod;
  try {
    const allMethods = await storage.getPaymentMethods();
    const found = allMethods.find((m) => m.name === req.paymentMethod || m.nameAr === req.paymentMethod);
    if (found) paymentName = found.nameAr;
  } catch {}
  const lines = [
    `👑 <b>طلب خاص - وساطة ملكية جديدة</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(req.orderNumber || req.id)}</code>`,
    ``,
    `🎮 <b>اللعبة:</b> ${escapeHtml(req.gameName)}`,
    `📝 <b>الوصف:</b> ${escapeHtml(req.description)}`,
    `💰 <b>نطاق السعر:</b> ${req.minPrice?.toLocaleString()} - ${req.maxPrice?.toLocaleString()} ج.م`,
    ``,
    `👤 <b>المشتري:</b> ${escapeHtml(req.buyerName)}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(req.buyerPhone)}</code>`,
    ``,
    `💳 <b>طريقة الدفع:</b> ${escapeHtml(paymentName)}`,
    req.senderPhone ? `📞 <b>رقم المحول منه:</b> ${escapeHtml(req.senderPhone)}` : null,
    `💵 <b>عمولة المشتري:</b> ${req.buyerCommission} ج.م`,
    `💵 <b>عمولة البائع:</b> ${req.sellerCommission} ج.م`,
    req.paymentProofUrl ? `🖼 <b>إثبات الدفع:</b> مرفق` : null,
    ``,
    `⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`,
  ].filter(Boolean).join("\n");

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ اعتماد الطلب", callback_data: `broker_ok:${req.id}` },
      { text: "❌ رفض الطلب", callback_data: `broker_rej:${req.id}` },
    ]],
  };
  for (const chatId of chatIds) {
    if (req.paymentProofUrl) {
      const ok = await sendTelegramPhotoUrl(chatId, req.paymentProofUrl, lines, { reply_markup: keyboard });
      if (ok.ok) continue;
    }
    await sendTelegramMessage(chatId, lines, { reply_markup: keyboard });
  }
}

export async function sendAccountOrderNotification(data: {
  eventType: "new_order" | "payment_proof" | "payment_confirmed" | "credentials_sent" | "buyer_confirmed" | "payout_sent" | "rejected" | "payout_info_received";
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  accountTitle: string;
  totalAmount: number;
  paymentProofUrl?: string | null;
  notes?: string | null;
  credentials?: string | null;
  vodafoneCash?: string | null;
  // Extra details for new_order
  gameType?: string | null;
  linkingMethod?: string | null;
  paymentMethod?: string | null;
  sellerPrice?: number | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  accountId?: string | null;
}): Promise<boolean> {
  if (!TELEGRAM_API) return false;
  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return false;

  const eventIcons: Record<string, string> = {
    new_order: "🛒 طلب شراء حساب جديد",
    payment_proof: "📸 تم رفع إثبات الدفع",
    payment_confirmed: "✅ تم تأكيد الدفع",
    credentials_sent: "🔑 تم إرسال بيانات الحساب للمشتري",
    buyer_confirmed: "🎉 المشتري أكد الاستلام",
    payout_sent: "💸 تم تحويل مستحقات البائع",
    payout_info_received: "📱 تم استلام رقم فودافون كاش",
    rejected: "❌ تم رفض الطلب",
  };

  const lines = [
    `<b>${eventIcons[data.eventType] || "🔔 تحديث طلب حساب"}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(data.orderNumber)}</code>`,
    "",
    `<b>👤 المشتري</b>`,
    `• الاسم: ${escapeHtml(data.customerName)}`,
    `• الهاتف: <code>${escapeHtml(data.customerPhone)}</code>`,
    "",
    `<b>🎮 تفاصيل الحساب</b>`,
    `• العنوان: ${escapeHtml(data.accountTitle)}`,
  ];

  if (data.gameType) lines.push(`• نوع اللعبة: ${escapeHtml(data.gameType)}`);
  if (data.linkingMethod) lines.push(`• طريقة الربط: ${escapeHtml(data.linkingMethod)}`);

  lines.push("", `<b>💰 المالية</b>`);
  lines.push(`• سعر الشراء (المشتري): <b>${data.totalAmount} ج</b>`);
  if (data.sellerPrice != null) {
    lines.push(`• مستحقات البائع: <b>${data.sellerPrice} ج</b>`);
    const commission = data.totalAmount - data.sellerPrice;
    lines.push(`• عمولة المتجر: <b>${commission} ج</b> (${Math.round(commission/data.totalAmount*100)}%)`);
  }
  if (data.paymentMethod) lines.push(`• طريقة الدفع: ${escapeHtml(data.paymentMethod)}`);

  if (data.sellerName || data.sellerPhone) {
    lines.push("", `<b>🧑‍💼 البائع</b>`);
    if (data.sellerName) lines.push(`• الاسم: ${escapeHtml(data.sellerName)}`);
    if (data.sellerPhone) lines.push(`• الهاتف: <code>${escapeHtml(data.sellerPhone)}</code>`);
  }

  if (data.notes) lines.push("", `📝 <b>ملاحظة:</b> ${escapeHtml(data.notes)}`);
  if (data.vodafoneCash) lines.push(`📱 <b>فودافون كاش:</b> <code>${escapeHtml(data.vodafoneCash)}</code>`);

  const text = lines.join("\n");

  const results = await Promise.all(chatIds.map(async (chatId) => {
    if (data.paymentProofUrl && data.eventType === "payment_proof") {
      const r = await sendTelegramPhotoUrl(chatId, data.paymentProofUrl, text);
      return r.ok;
    }
    const r = await sendTelegramMessage(chatId, text);
    return r.ok;
  }));
  return results.some(Boolean);
}

export async function sendChatNotificationToTelegram(orderNumber: string, customerName: string, message: string): Promise<boolean> {
  if (!TELEGRAM_API) return false;
  const chatIds = await getTelegramChatIds();
  if (chatIds.length === 0) return false;

  const text = [
    "<b>💬 رسالة جديدة من زبون</b>",
    "",
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(orderNumber)}</code>`,
    `👤 <b>الاسم:</b> ${escapeHtml(customerName)}`,
    `💬 <b>الرسالة:</b> ${escapeHtml(message)}`,
  ].join("\n");

  const results = await Promise.all(
    chatIds.map((id) => sendTelegramMessage(id, text).then((r) => r.ok))
  );
  return results.some(Boolean);
}

// ----- New Customer Registration -----
export async function sendNewCustomerToTelegram(customer: any): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (!chatIds.length) return;
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const text = [
    `👤 <b>عميل جديد سجّل في المتجر</b>`,
    ``,
    `📛 <b>الاسم:</b> ${escapeHtml(customer.name || "")}`,
    `🔑 <b>المستخدم:</b> <code>${escapeHtml(customer.username || "")}</code>`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(customer.phone || "")}</code>`,
    ``,
    `⏰ ${escapeHtml(now)}`,
  ].join("\n");
  for (const id of chatIds) {
    await sendTelegramMessage(id, text);
  }
}

// ----- Wallet Charge Request (new) -----
export async function sendWalletRequestToTelegram(req: any): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (!chatIds.length) return;
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });

  const methodMap: Record<string, string> = {
    vodafone_cash: "فودافون كاش",
    instapay: "إنستاباي",
    etisalat_cash: "اتصالات كاش",
    we_pay: "وي باي",
    orange_cash: "أورنج كاش",
    bank_transfer: "تحويل بنكي",
  };
  const methodLabel = methodMap[req.paymentMethod] || req.paymentMethod || "غير محدد";

  const text = [
    `💳 <b>طلب شحن محفظة جديد</b>`,
    ``,
    `👤 <b>العميل:</b> ${escapeHtml(req.customerName || "")}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(req.customerPhone || "")}</code>`,
    `💰 <b>المبلغ:</b> <code>${req.amount} ج.م</code>`,
    `💳 <b>طريقة الدفع:</b> ${escapeHtml(methodLabel)}`,
    req.senderPhone ? `📞 <b>رقم المحوّل:</b> <code>${escapeHtml(req.senderPhone)}</code>` : null,
    req.paymentProofUrl ? `🖼 <b>إثبات الدفع:</b> مرفق` : null,
    ``,
    `⏰ ${escapeHtml(now)}`,
  ].filter(Boolean).join("\n");

  const keyboard = {
    inline_keyboard: [[
      { text: "✅ قبول الشحن", callback_data: `wlt_ok:${req.id}` },
      { text: "❌ رفض الشحن", callback_data: `wlt_rej:${req.id}` },
    ]],
  };

  for (const id of chatIds) {
    if (req.paymentProofUrl?.startsWith("/uploads/")) {
      const localFile = await getLocalFileBuffer(req.paymentProofUrl);
      if (localFile) {
        const r = await sendTelegramPhotoFile(id, localFile.buffer, localFile.filename, text, { reply_markup: keyboard });
        if (r.ok) continue;
      }
    }
    if (req.paymentProofUrl && req.paymentProofUrl.startsWith("http")) {
      const r = await sendTelegramPhotoUrl(id, req.paymentProofUrl, text, { reply_markup: keyboard });
      if (r.ok) continue;
    }
    await sendTelegramMessage(id, text, { reply_markup: keyboard });
  }
}

// ----- Wallet Charge Status (approved / rejected) -----
export async function sendWalletStatusToTelegram(req: any, status: "approved" | "rejected", adminNote?: string): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (!chatIds.length) return;
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const isOk = status === "approved";

  const text = [
    isOk ? `✅ <b>تم قبول طلب شحن المحفظة</b>` : `❌ <b>تم رفض طلب شحن المحفظة</b>`,
    ``,
    `👤 <b>العميل:</b> ${escapeHtml(req.customerName || "")}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(req.customerPhone || "")}</code>`,
    `💰 <b>المبلغ:</b> <code>${req.amount} ج.م</code>`,
    adminNote ? `📝 <b>ملاحظة الأدمن:</b> ${escapeHtml(adminNote)}` : null,
    ``,
    `⏰ ${escapeHtml(now)}`,
  ].filter(Boolean).join("\n");

  for (const id of chatIds) {
    await sendTelegramMessage(id, text);
  }
}

// ----- Order Status Changed by Admin -----
export async function sendOrderStatusChangedToTelegram(order: any, newStatus: string): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (!chatIds.length) return;

  const statusMap: Record<string, { emoji: string; label: string }> = {
    completed:  { emoji: "✅", label: "مكتمل" },
    processing: { emoji: "🔄", label: "قيد التنفيذ" },
    cancelled:  { emoji: "❌", label: "ملغي" },
    pending:    { emoji: "⏳", label: "معلق" },
  };
  const s = statusMap[newStatus] || { emoji: "📦", label: newStatus };
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });

  const gameName = order.game?.nameAr || order.game?.name || order.gameName || "";
  const pkgName = order.package?.name || order.packageName || "";

  const text = [
    `${s.emoji} <b>تحديث حالة الطلب ← ${s.label}</b>`,
    ``,
    `📋 <b>رقم الطلب:</b> <code>${escapeHtml(order.orderNumber || "")}</code>`,
    `👤 <b>العميل:</b> ${escapeHtml(order.customerName || "")}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(order.customerPhone || "")}</code>`,
    gameName ? `🎮 <b>اللعبة:</b> ${escapeHtml(gameName)}` : null,
    pkgName  ? `📦 <b>الباقة:</b> ${escapeHtml(pkgName)}` : null,
    `💰 <b>المبلغ:</b> ${order.totalAmount} ج.م`,
    ``,
    `⏰ ${escapeHtml(now)}`,
  ].filter(Boolean).join("\n");

  for (const id of chatIds) {
    await sendTelegramMessage(id, text);
  }
}

// ----- Support Chat (customer to admin) -----
export async function sendSupportMessageToTelegram(customerName: string, customerPhone: string, message: string): Promise<void> {
  if (!TELEGRAM_API) return;
  const chatIds = await getTelegramChatIds();
  if (!chatIds.length) return;
  const now = new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" });
  const text = [
    `💬 <b>رسالة دعم فني جديدة</b>`,
    ``,
    `👤 <b>العميل:</b> ${escapeHtml(customerName)}`,
    `📱 <b>الهاتف:</b> <code>${escapeHtml(customerPhone)}</code>`,
    `💬 <b>الرسالة:</b> ${escapeHtml(message)}`,
    ``,
    `⏰ ${escapeHtml(now)}`,
  ].join("\n");
  for (const id of chatIds) {
    await sendTelegramMessage(id, text);
  }
}

export function getPermanentChatIds(): string[] {
  return [...PERMANENT_CHAT_IDS];
}

export async function testTelegramConnection(): Promise<{
  botOk: boolean;
  botName?: string;
  chatIds: string[];
  sendResults: Array<{ chatId: string; ok: boolean; error?: string }>;
}> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_API) return { botOk: false, chatIds: [], sendResults: [] };

  let botOk = false;
  let botName = "";
  try {
    const meRes = await fetch(`${TELEGRAM_API}/getMe`);
    const meData = await meRes.json() as any;
    botOk = meData.ok;
    botName = meData.result?.username || "";
  } catch {}

  const chatIds = await getTelegramChatIds();
  const sendResults = await Promise.all(
    chatIds.map(async (chatId) => {
      const r = await sendTelegramMessage(chatId, "✅ اختبار اتصال - Astro Bot يعمل بنجاح!\n\nاضغط /start لفتح القائمة");
      return { chatId, ok: r.ok, error: r.error };
    })
  );

  return { botOk, botName, chatIds, sendResults };
}
