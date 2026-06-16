import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(),
  image: text("image"),
  color: text("color").notNull(),
  description: text("description"),
  loginType: text("login_type").default("both"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().references(() => games.id),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  category: text("category"),
  loginType: text("login_type"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  orderType: text("order_type").notNull().default("topup"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  gameId: varchar("game_id").references(() => games.id, { onDelete: "set null" }),
  packageId: varchar("package_id").references(() => packages.id, { onDelete: "set null" }),
  courseId: varchar("course_id").references(() => courses.id, { onDelete: "set null" }),
  accountId: varchar("account_id").references(() => accounts.id, { onDelete: "set null" }),
  playerId: text("player_id"),
  accountUsername: text("account_username"),
  accountPassword: text("account_password"),
  loginType: text("login_type").default("id"),
  linkingMethod: text("linking_method"),
  quantity: integer("quantity").default(1),
  paymentMethod: text("payment_method").notNull(),
  paymentProofUrl: text("payment_proof_url"),
  senderPhone: text("sender_phone"),
  totalAmount: integer("total_amount").notNull(),
  paymentType: text("payment_type").default("direct"),
  customerId: varchar("customer_id").references(() => customers.id),
  status: text("status").notNull().default("pending"),
  accountOrderStatus: text("account_order_status"),
  credentialsDelivered: text("credentials_delivered"),
  vodafoneCashNumber: text("vodafone_cash_number"),
  payoutStatus: text("payout_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  icon: text("icon").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").references(() => games.id),
  gameType: text("game_type"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  level: integer("level"),
  rank: text("rank"),
  features: text("features").array(),
  images: text("images").array(),
  isSold: boolean("is_sold").default(false),
  isActive: boolean("is_active").default(true),
  linkingMethod: text("linking_method"),
  sellerName: text("seller_name"),
  sellerPhone: text("seller_phone"),
  sellerPrice: integer("seller_price"),
  source: text("source").default("admin"),
  sellRequestId: varchar("sell_request_id"),
  accountCredentials: text("account_credentials"),
  sellerPaid: boolean("seller_paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountSellRequests = pgTable("account_sell_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id),
  sellerName: text("seller_name").notNull(),
  sellerPhone: text("seller_phone").notNull(),
  gameId: varchar("game_id").references(() => games.id),
  gameType: text("game_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requestedPrice: integer("requested_price").notNull(),
  linkingMethod: text("linking_method").notNull(),
  images: text("images").array(),
  accountCredentials: text("account_credentials"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  approvedAccountId: varchar("approved_account_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  icon: text("icon").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  senderType: text("sender_type").notNull(), // "customer" | "admin"
  message: text("message").notNull(),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  senderType: text("sender_type").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerInbox = pgTable("customer_inbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerPhone: text("customer_phone").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  orderId: varchar("order_id").references(() => orders.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletRequests = pgTable("wallet_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  paymentMethod: text("payment_method"),
  senderPhone: text("sender_phone"),
  paymentProofUrl: text("payment_proof_url"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gamesRelations = relations(games, ({ many }) => ({
  packages: many(packages),
  orders: many(orders),
  accounts: many(accounts),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  game: one(games, {
    fields: [packages.gameId],
    references: [games.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  game: one(games, {
    fields: [orders.gameId],
    references: [games.id],
  }),
  package: one(packages, {
    fields: [orders.packageId],
    references: [packages.id],
  }),
  course: one(courses, {
    fields: [orders.courseId],
    references: [courses.id],
  }),
  account: one(accounts, {
    fields: [orders.accountId],
    references: [accounts.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  game: one(games, {
    fields: [accounts.gameId],
    references: [games.id],
  }),
  orders: many(orders),
}));

export const accountSellRequestsRelations = relations(accountSellRequests, ({ one }) => ({
  game: one(games, {
    fields: [accountSellRequests.gameId],
    references: [games.id],
  }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  orders: many(orders),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertAccountSellRequestSchema = createInsertSchema(accountSellRequests).omit({
  id: true,
  createdAt: true,
}).partial({ customerId: true });

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerInboxSchema = createInsertSchema(customerInbox).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertAccountSellRequest = z.infer<typeof insertAccountSellRequestSchema>;
export type AccountSellRequest = typeof accountSellRequests.$inferSelect;

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

export type InsertCustomerInbox = z.infer<typeof insertCustomerInboxSchema>;
export type CustomerInbox = typeof customerInbox.$inferSelect;

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").unique(),
  password: text("password"),
  plainPassword: text("plain_password"),
  phone: text("phone").notNull().unique(),
  countryCode: text("country_code").notNull().default("+20"),
  name: text("name"),
  email: text("email"),
  googleId: text("google_id").unique(),
  authProvider: text("auth_provider").default("local"),
  profileCompleted: boolean("profile_completed").default(true),
  balance: integer("balance").notNull().default(0),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  isBanned: boolean("is_banned").default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerSessions = pgTable("customer_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerGameIds = pgTable("customer_game_ids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  gameId: varchar("game_id").notNull().references(() => games.id),
  playerId: text("player_id").notNull(),
  label: text("label"),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  points: integer("points").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletRequestsRelations = relations(walletRequests, ({ one }) => ({
  customer: one(customers, { fields: [walletRequests.customerId], references: [customers.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sessions: many(customerSessions),
  gameIds: many(customerGameIds),
  walletTransactions: many(walletTransactions),
  loyaltyTransactions: many(loyaltyTransactions),
  walletRequests: many(walletRequests),
}));

export const customerSessionsRelations = relations(customerSessions, ({ one }) => ({
  customer: one(customers, { fields: [customerSessions.customerId], references: [customers.id] }),
}));

export const customerGameIdsRelations = relations(customerGameIds, ({ one }) => ({
  customer: one(customers, { fields: [customerGameIds.customerId], references: [customers.id] }),
  game: one(games, { fields: [customerGameIds.gameId], references: [games.id] }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  customer: one(customers, { fields: [walletTransactions.customerId], references: [customers.id] }),
  order: one(orders, { fields: [walletTransactions.orderId], references: [orders.id] }),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  customer: one(customers, { fields: [loyaltyTransactions.customerId], references: [customers.id] }),
  order: one(orders, { fields: [loyaltyTransactions.orderId], references: [orders.id] }),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const insertCustomerSessionSchema = createInsertSchema(customerSessions).omit({ id: true, createdAt: true });
export type InsertCustomerSession = z.infer<typeof insertCustomerSessionSchema>;
export type CustomerSession = typeof customerSessions.$inferSelect;

export const insertCustomerGameIdSchema = createInsertSchema(customerGameIds).omit({ id: true, lastUsedAt: true });
export type InsertCustomerGameId = z.infer<typeof insertCustomerGameIdSchema>;
export type CustomerGameId = typeof customerGameIds.$inferSelect;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({ id: true, createdAt: true });
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;

export const insertWalletRequestSchema = createInsertSchema(walletRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWalletRequest = z.infer<typeof insertWalletRequestSchema>;
export type WalletRequest = typeof walletRequests.$inferSelect;

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull().unique(),
  data: text("data").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({ id: true, createdAt: true });
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  target: text("target").notNull(),
  meta: text("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  images: text("images").array(),
  status: text("status").notNull().default("draft"),
  commentsEnabled: boolean("comments_enabled").default(true),
  publisherName: text("publisher_name").notNull().default("الإدارة"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityPostsRelations = relations(communityPosts, ({ many }) => ({
  comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(communityPosts, { fields: [postComments.postId], references: [communityPosts.id] }),
  customer: one(customers, { fields: [postComments.customerId], references: [customers.id] }),
}));

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;

export const insertPostCommentSchema = createInsertSchema(postComments).omit({ id: true, createdAt: true });
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type PostComment = typeof postComments.$inferSelect;

// ─── Admin Users (moderators + super admins) ───────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"), // hashed, null for Google-only
  name: text("name").notNull(),
  role: text("role").notNull().default("moderator"), // "super_admin" | "moderator"
  googleId: text("google_id").unique(),
  isActive: boolean("is_active").notNull().default(true),
  permissions: text("permissions").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// ─── Discount Codes ────────────────────────────────────────────────────────
export const discountCodes = pgTable("discount_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  name: text("name"),
  discountType: text("discount_type").notNull().default("percent"), // "percent" | "fixed"
  discountValue: integer("discount_value").notNull(), // percent 0-100 or fixed amount
  scope: text("scope").notNull().default("all_games"), // "all_games" | "specific_game" | "accounts_marketplace"
  gameId: varchar("game_id"), // if scope = "specific_game"
  maxUses: integer("max_uses"), // null = unlimited
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({ id: true, createdAt: true, usedCount: true });
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCode = typeof discountCodes.$inferSelect;

// ─── Competitions ────────────────────────────────────────────────────────────
export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  gameName: text("game_name").notNull(),
  gameImage: text("game_image"),
  rules: text("rules"),
  scheduledAt: timestamp("scheduled_at"),
  roomCode: text("room_code"),
  roomPassword: text("room_password"),
  prize: text("prize"),
  entryFee: integer("entry_fee").default(0),
  status: text("status").notNull().default("upcoming"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true, createdAt: true });
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;

// ─── Sardarb Items ────────────────────────────────────────────────────────────
export const sardarbItems = pgTable("sardarb_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("سكن"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  image: text("image"),
  stock: integer("stock").notNull().default(1),
  isAvailable: boolean("is_available").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sardarbOrders = pgTable("sardarb_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  itemId: varchar("item_id").notNull().references(() => sardarbItems.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  paymentMethod: text("payment_method").notNull(),
  senderPhone: text("sender_phone"),
  paymentProofUrl: text("payment_proof_url"),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("pending"),
  deliveredCode: text("delivered_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSardarbItemSchema = createInsertSchema(sardarbItems).omit({ id: true, createdAt: true });
export type InsertSardarbItem = z.infer<typeof insertSardarbItemSchema>;
export type SardarbItem = typeof sardarbItems.$inferSelect;

export const insertSardarbOrderSchema = createInsertSchema(sardarbOrders).omit({ id: true, orderNumber: true, createdAt: true });
export type InsertSardarbOrder = z.infer<typeof insertSardarbOrderSchema>;
export type SardarbOrder = typeof sardarbOrders.$inferSelect;

// ─── Virtual Numbers ──────────────────────────────────────────────────────────
export const virtualNumberCountries = pgTable("virtual_number_countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryName: text("country_name").notNull(),
  countryFlag: text("country_flag").notNull(),
  countryCode: text("country_code").notNull(),
  price: integer("price").notNull(),
  isAvailable: boolean("is_available").default(true),
  sortOrder: integer("sort_order").default(0),
});

export const virtualNumberOrders = pgTable("virtual_number_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  countryId: varchar("country_id").notNull().references(() => virtualNumberCountries.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  paymentMethod: text("payment_method").notNull(),
  senderPhone: text("sender_phone"),
  paymentProofUrl: text("payment_proof_url"),
  totalAmount: integer("total_amount").notNull(),
  status: text("status").notNull().default("pending_payment"),
  virtualNumber: text("virtual_number"),
  otpCode: text("otp_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVirtualNumberCountrySchema = createInsertSchema(virtualNumberCountries).omit({ id: true });
export type InsertVirtualNumberCountry = z.infer<typeof insertVirtualNumberCountrySchema>;
export type VirtualNumberCountry = typeof virtualNumberCountries.$inferSelect;

export const insertVirtualNumberOrderSchema = createInsertSchema(virtualNumberOrders).omit({ id: true, orderNumber: true, createdAt: true });
export type InsertVirtualNumberOrder = z.infer<typeof insertVirtualNumberOrderSchema>;
export type VirtualNumberOrder = typeof virtualNumberOrders.$inferSelect;

// ─── Royal Broker System ───────────────────────────────────────────────────────
// Buyer submits a spec request for an account they want to purchase
export const brokerRequests = pgTable("broker_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  buyerId: varchar("buyer_id").references(() => customers.id),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull(),
  gameName: text("game_name").notNull(),
  description: text("description").notNull(),
  minPrice: integer("min_price").notNull(),
  maxPrice: integer("max_price").notNull(),
  referenceImages: text("reference_images").array().default(sql`ARRAY[]::text[]`),
  paymentMethod: text("payment_method").notNull(),
  senderPhone: text("sender_phone"),
  paymentProofUrl: text("payment_proof_url"),
  // Commission: 'split' = 3% buyer + 3% seller, 'buyer_all' = 6% buyer only
  commissionType: text("commission_type").notNull().default("split"),
  buyerCommission: integer("buyer_commission").notNull().default(0),
  sellerCommission: integer("seller_commission").notNull().default(0),
  totalPaid: integer("total_paid").notNull(),
  // status flow: pending → approved → matched → in_escrow → delivered → completed
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  matchedOfferId: varchar("matched_offer_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Seller submits an offer matching a buyer request
export const brokerOffers = pgTable("broker_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => brokerRequests.id),
  sellerId: varchar("seller_id").references(() => customers.id),
  sellerName: text("seller_name").notNull(),
  sellerPhone: text("seller_phone").notNull(),
  gameName: text("game_name").notNull(),
  accountDescription: text("account_description").notNull(),
  accountImages: text("account_images").array().default(sql`ARRAY[]::text[]`),
  accountVideo: text("account_video"),
  accountLevel: text("account_level"),
  accountRank: text("account_rank"),
  accountSkins: text("account_skins"),
  linkingType: text("linking_type").notNull().default("email"),
  accountEmail: text("account_email"),
  accountPhone: text("account_phone"),
  accountPassword: text("account_password"),
  sellerPrice: integer("seller_price").notNull(),
  // status: pending_review → accepted → rejected → in_escrow → delivered
  status: text("status").notNull().default("pending_review"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Live Trust Pulse events (recent successful transactions shown publicly)
export const trustPulseEvents = pgTable("trust_pulse_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // 'broker_completed', 'topup', 'account_sold'
  gameName: text("game_name").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBrokerRequestSchema = createInsertSchema(brokerRequests).omit({ id: true, orderNumber: true, createdAt: true });
export type InsertBrokerRequest = z.infer<typeof insertBrokerRequestSchema>;
export type BrokerRequest = typeof brokerRequests.$inferSelect;

export const insertBrokerOfferSchema = createInsertSchema(brokerOffers).omit({ id: true, createdAt: true });
export type InsertBrokerOffer = z.infer<typeof insertBrokerOfferSchema>;
export type BrokerOffer = typeof brokerOffers.$inferSelect;

export const insertTrustPulseEventSchema = createInsertSchema(trustPulseEvents).omit({ id: true, createdAt: true });
export type InsertTrustPulseEvent = z.infer<typeof insertTrustPulseEventSchema>;
export type TrustPulseEvent = typeof trustPulseEvents.$inferSelect;
