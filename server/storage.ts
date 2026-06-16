import {
  users, games, packages, orders, courses, paymentMethods, settings, accounts, accountSellRequests, notifications, chatMessages, customerInbox, uploadedFiles, supportMessages,
  customers, customerSessions, customerGameIds, walletTransactions, loyaltyTransactions, walletRequests, pushSubscriptions, analyticsEvents,
  communityPosts, postComments, adminUsers, discountCodes,
  competitions, sardarbItems, sardarbOrders, virtualNumberCountries, virtualNumberOrders,
  brokerRequests, brokerOffers, trustPulseEvents,
  type User, type InsertUser,
  type Game, type InsertGame,
  type Package, type InsertPackage,
  type Order, type InsertOrder,
  type Course, type InsertCourse,
  type PaymentMethod, type InsertPaymentMethod,
  type Account, type InsertAccount,
  type AccountSellRequest, type InsertAccountSellRequest,
  type Notification, type InsertNotification,
  type Setting, type InsertSetting,
  type ChatMessage, type InsertChatMessage,
  type SupportMessage, type InsertSupportMessage,
  type CustomerInbox, type InsertCustomerInbox,
  type Customer, type InsertCustomer,
  type CustomerSession, type InsertCustomerSession,
  type CustomerGameId, type InsertCustomerGameId,
  type AdminUser, type InsertAdminUser,
  type DiscountCode, type InsertDiscountCode,
  type WalletTransaction, type InsertWalletTransaction,
  type LoyaltyTransaction, type InsertLoyaltyTransaction,
  type WalletRequest, type InsertWalletRequest,
  type PushSubscription, type InsertPushSubscription,
  type CommunityPost, type InsertCommunityPost,
  type PostComment, type InsertPostComment,
  type Competition, type InsertCompetition,
  type SardarbItem, type InsertSardarbItem,
  type SardarbOrder, type InsertSardarbOrder,
  type VirtualNumberCountry, type InsertVirtualNumberCountry,
  type VirtualNumberOrder, type InsertVirtualNumberOrder,
  type BrokerRequest, type InsertBrokerRequest,
  type BrokerOffer, type InsertBrokerOffer,
  type TrustPulseEvent, type InsertTrustPulseEvent,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, count } from "drizzle-orm";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = "BLYi9itrm0JesE_AOtSgapYN-3iV2OxsHQGWZsMLUWgkYNF6xaspThHiTq0oKR1VorWWtPjEDqhuO-dumYldUN4";
const VAPID_PRIVATE_KEY = "8fjchslkfgtGbHUmuyK4bBUXjfPGF9hYwWmyKwQvKyo";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

webpush.setVapidDetails(
  "mailto:admin@moscow-store.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getGames(): Promise<Game[]>;
  getGameById(id: string): Promise<Game | undefined>;
  getGameBySlug(slug: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<boolean>;
  deleteAllGames(): Promise<void>;

  getPackages(): Promise<Package[]>;
  getPackagesByGameId(gameId: string): Promise<Package[]>;
  getPackageById(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  deleteGamePackages(gameId: string): Promise<void>;
  deleteAllPackages(): Promise<void>;

  getOrders(orderType?: string): Promise<(Order & { game?: Game; package?: Package; course?: Course; account?: Account })[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  getOrderStats(): Promise<{ totalOrders: number; pendingOrders: number; completedOrders: number; totalRevenue: number; todayOrders: number }>;

  getCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<boolean>;

  getAccounts(): Promise<(Account & { game?: Game })[]>;
  getAccountById(id: string): Promise<Account | undefined>;
  getAccountsByGameId(gameId: string): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined>;
  deleteAccount(id: string): Promise<boolean>;

  getAccountSellRequests(status?: string): Promise<(AccountSellRequest & { game?: Game })[]>;
  getAccountSellRequestById(id: string): Promise<AccountSellRequest | undefined>;
  createAccountSellRequest(req: InsertAccountSellRequest): Promise<AccountSellRequest>;
  updateAccountSellRequestStatus(id: string, status: string, adminNote?: string, approvedAccountId?: string): Promise<AccountSellRequest | undefined>;

  getPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<boolean>;

  getNotifications(): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  getUnreadNotificationsCount(): Promise<number>;

  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  getChatMessages(orderId: string): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  markChatMessagesRead(orderId: string, senderType: string): Promise<void>;
  getUnreadChatCount(senderType: string): Promise<number>;

  getSupportMessages(customerId: string): Promise<SupportMessage[]>;
  createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage>;
  markSupportMessagesRead(customerId: string, senderType: string): Promise<void>;
  getSupportConversations(): Promise<{ customerId: string; lastMessage: string; lastAt: Date; unreadCount: number; customer?: any }[]>;
  getUnreadSupportCount(): Promise<number>;

  getCustomerInbox(phone: string): Promise<CustomerInbox[]>;
  createCustomerInboxMessage(msg: InsertCustomerInbox): Promise<CustomerInbox>;
  markInboxRead(id: string): Promise<void>;

  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrdersByPhone(phone: string): Promise<Order[]>;
  getAccountOrders(filters?: { customerId?: string; status?: string }): Promise<any[]>;
  updateAccountOrderStatus(id: string, data: { accountOrderStatus?: string; credentialsDelivered?: string; vodafoneCashNumber?: string; payoutStatus?: string; status?: string; notes?: string; paymentProofUrl?: string; senderPhone?: string }): Promise<Order | undefined>;

  saveUploadedFile(filename: string, data: string, contentType: string): Promise<void>;
  getUploadedFile(filename: string): Promise<{ data: string; contentType: string } | null>;

  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getCustomerById(id: string): Promise<Customer | undefined>;
  getCustomerByUsername(username: string): Promise<Customer | undefined>;
  getCustomerByReferralCode(code: string): Promise<Customer | undefined>;
  getCustomerByGoogleId(googleId: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  getCustomerStats(): Promise<{ totalCustomers: number; totalBalance: number; activeCustomers: number }>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined>;
  createCustomerSession(session: InsertCustomerSession): Promise<CustomerSession>;
  getCustomerByToken(token: string): Promise<Customer | undefined>;
  deleteCustomerSession(token: string): Promise<void>;
  deleteCustomerSessionsByCustomerId(customerId: string): Promise<void>;
  getCustomerGameIds(customerId: string): Promise<(CustomerGameId & { game?: Game })[]>;
  upsertCustomerGameId(data: InsertCustomerGameId): Promise<CustomerGameId>;
  getWalletTransactions(customerId: string): Promise<WalletTransaction[]>;
  createWalletTransaction(tx: InsertWalletTransaction): Promise<WalletTransaction>;
  getLoyaltyTransactions(customerId: string): Promise<LoyaltyTransaction[]>;
  createLoyaltyTransaction(tx: InsertLoyaltyTransaction): Promise<LoyaltyTransaction>;
  getOrdersByCustomerPhone(phone: string): Promise<any[]>;

  getWalletRequests(status?: string): Promise<WalletRequest[]>;
  getWalletRequestById(id: string): Promise<WalletRequest | undefined>;
  getWalletRequestsByCustomerId(customerId: string): Promise<WalletRequest[]>;
  createWalletRequest(req: InsertWalletRequest): Promise<WalletRequest>;
  updateWalletRequestStatus(id: string, status: string, adminNote?: string): Promise<WalletRequest | undefined>;

  getCustomerInboxByCustomerId(customerId: string): Promise<CustomerInbox[]>;

  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(endpoint: string): Promise<void>;
  getPushSubscriptionsByCustomerId(customerId: string): Promise<PushSubscription[]>;
  sendPushNotification(customerId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<void>;

  trackEvent(eventType: string, target: string, meta?: string): Promise<void>;
  getAnalyticsOverview(): Promise<any>;
  getTopGames(): Promise<any[]>;
  getTopPackages(): Promise<any[]>;
  getCustomerActivity(): Promise<any[]>;
  getTopCustomers(): Promise<any[]>;
  getNewUsersStats(): Promise<any>;
  getBehaviorStats(): Promise<any>;

  getCommunityPosts(includeAll?: boolean): Promise<(CommunityPost & { commentCount: number })[]>;
  getCommunityPostById(id: string): Promise<(CommunityPost & { commentCount: number }) | undefined>;
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  updateCommunityPost(id: string, post: Partial<InsertCommunityPost>): Promise<CommunityPost | undefined>;
  deleteCommunityPost(id: string): Promise<boolean>;

  getPostComments(postId: string, includeHidden?: boolean): Promise<PostComment[]>;
  getAllPostComments(filters?: { postId?: string }): Promise<(PostComment & { postTitle?: string })[]>;
  createPostComment(comment: InsertPostComment): Promise<PostComment>;
  updatePostComment(id: string, data: Partial<InsertPostComment>): Promise<PostComment | undefined>;
  deletePostComment(id: string): Promise<boolean>;

  getAdminUsers(): Promise<AdminUser[]>;
  getAdminUserById(id: string): Promise<AdminUser | undefined>;
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  getAdminUserByGoogleId(googleId: string): Promise<AdminUser | undefined>;
  createAdminUser(user: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined>;
  deleteAdminUser(id: string): Promise<boolean>;

  getDiscountCodes(): Promise<DiscountCode[]>;
  getDiscountCodeById(id: string): Promise<DiscountCode | undefined>;
  getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined>;
  createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode>;
  updateDiscountCode(id: string, data: Partial<InsertDiscountCode>): Promise<DiscountCode | undefined>;
  deleteDiscountCode(id: string): Promise<boolean>;
  incrementDiscountCodeUsage(id: string): Promise<void>;

  getCompetitions(includeHidden?: boolean): Promise<Competition[]>;
  getCompetitionById(id: string): Promise<Competition | undefined>;
  createCompetition(comp: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined>;
  deleteCompetition(id: string): Promise<boolean>;

  getSardarbItems(): Promise<SardarbItem[]>;
  getSardarbItemById(id: string): Promise<SardarbItem | undefined>;
  createSardarbItem(item: InsertSardarbItem): Promise<SardarbItem>;
  updateSardarbItem(id: string, data: Partial<InsertSardarbItem>): Promise<SardarbItem | undefined>;
  deleteSardarbItem(id: string): Promise<boolean>;
  getSardarbOrders(filters?: { customerId?: string; status?: string }): Promise<(SardarbOrder & { item?: SardarbItem })[]>;
  getSardarbOrderById(id: string): Promise<(SardarbOrder & { item?: SardarbItem }) | undefined>;
  createSardarbOrder(order: InsertSardarbOrder): Promise<SardarbOrder>;
  updateSardarbOrder(id: string, data: Partial<SardarbOrder>): Promise<SardarbOrder | undefined>;

  getVirtualNumberCountries(): Promise<VirtualNumberCountry[]>;
  getVirtualNumberCountryById(id: string): Promise<VirtualNumberCountry | undefined>;
  createVirtualNumberCountry(country: InsertVirtualNumberCountry): Promise<VirtualNumberCountry>;
  updateVirtualNumberCountry(id: string, data: Partial<InsertVirtualNumberCountry>): Promise<VirtualNumberCountry | undefined>;
  deleteVirtualNumberCountry(id: string): Promise<boolean>;
  getVirtualNumberOrders(filters?: { customerId?: string; status?: string }): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]>;
  getVirtualNumberOrderById(id: string): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry }) | undefined>;
  getVirtualNumberOrdersByCustomer(customerId: string): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]>;
  createVirtualNumberOrder(order: InsertVirtualNumberOrder): Promise<VirtualNumberOrder>;
  updateVirtualNumberOrder(id: string, data: Partial<VirtualNumberOrder>): Promise<VirtualNumberOrder | undefined>;

  // ── Broker System ──────────────────────────────────────────────────────────
  getBrokerRequests(filters?: { status?: string; buyerId?: string }): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer })[]>;
  getBrokerRequestById(id: string): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer }) | undefined>;
  getBrokerRequestsByBuyer(buyerId: string): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer })[]>;
  createBrokerRequest(req: InsertBrokerRequest): Promise<BrokerRequest>;
  updateBrokerRequest(id: string, data: Partial<BrokerRequest>): Promise<BrokerRequest | undefined>;
  deleteBrokerRequest(id: string): Promise<boolean>;
  getBrokerOffers(filters?: { requestId?: string; sellerId?: string; status?: string }): Promise<BrokerOffer[]>;
  getBrokerOfferById(id: string): Promise<BrokerOffer | undefined>;
  createBrokerOffer(offer: InsertBrokerOffer): Promise<BrokerOffer>;
  updateBrokerOffer(id: string, data: Partial<BrokerOffer>): Promise<BrokerOffer | undefined>;
  // ── Trust Pulse ─────────────────────────────────────────────────────────────
  getRecentTrustPulseEvents(limit?: number): Promise<TrustPulseEvent[]>;
  createTrustPulseEvent(event: InsertTrustPulseEvent): Promise<TrustPulseEvent>;

  seedData(): Promise<void>;
  seedDefaultGames(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getGames(): Promise<Game[]> {
    return db.select().from(games).orderBy(games.sortOrder);
  }

  async getGameById(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getGameBySlug(slug: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.slug, slug));
    return game || undefined;
  }

  async createGame(game: InsertGame): Promise<Game> {
    const [newGame] = await db.insert(games).values(game).returning();
    return newGame;
  }

  async updateGame(id: string, game: Partial<InsertGame>): Promise<Game | undefined> {
    const [updated] = await db.update(games).set(game).where(eq(games.id, id)).returning();
    return updated || undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    await db.delete(packages).where(eq(packages.gameId, id));
    await db.delete(games).where(eq(games.id, id));
    return true;
  }

  async deleteAllGames(): Promise<void> {
    await db.delete(packages);
    await db.delete(games);
  }

  async getPackages(): Promise<Package[]> {
    return db.select().from(packages).where(eq(packages.isActive, true)).orderBy(packages.sortOrder);
  }

  async getPackagesByGameId(gameId: string): Promise<Package[]> {
    return db.select().from(packages).where(and(eq(packages.gameId, gameId), eq(packages.isActive, true))).orderBy(packages.sortOrder);
  }

  async getPackageById(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg || undefined;
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [newPkg] = await db.insert(packages).values(pkg).returning();
    return newPkg;
  }

  async updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined> {
    const [updated] = await db.update(packages).set(pkg).where(eq(packages.id, id)).returning();
    return updated || undefined;
  }

  async deletePackage(id: string): Promise<boolean> {
    await db.delete(packages).where(eq(packages.id, id));
    return true;
  }

  async deleteGamePackages(gameId: string): Promise<void> {
    await db.delete(packages).where(eq(packages.gameId, gameId));
  }

  async deleteAllPackages(): Promise<void> {
    await db.delete(packages);
  }

  async getOrders(orderType?: string): Promise<(Order & { game?: Game; package?: Package; course?: Course; account?: Account })[]> {
    let ordersData;
    if (orderType) {
      ordersData = await db.select().from(orders).where(eq(orders.orderType, orderType)).orderBy(desc(orders.createdAt));
    } else {
      ordersData = await db.select().from(orders).orderBy(desc(orders.createdAt));
    }
    
    const result = await Promise.all(ordersData.map(async (order) => {
      let game, pkg, course, account;
      if (order.gameId) {
        [game] = await db.select().from(games).where(eq(games.id, order.gameId));
      }
      if (order.packageId) {
        [pkg] = await db.select().from(packages).where(eq(packages.id, order.packageId));
      }
      if (order.courseId) {
        [course] = await db.select().from(courses).where(eq(courses.id, order.courseId));
      }
      if (order.accountId) {
        [account] = await db.select().from(accounts).where(eq(accounts.id, order.accountId));
      }
      return { ...order, game, package: pkg, course, account };
    }));

    return result;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderNumber = `MS${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const [newOrder] = await db.insert(orders).values({ ...order, orderNumber }).returning();
    
    await this.createNotification({
      type: "new_order",
      title: "طلب جديد",
      message: `طلب جديد رقم ${orderNumber} من ${order.customerName}`,
      orderId: newOrder.id,
    });
    
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteOrder(id: string): Promise<boolean> {
    await db.delete(chatMessages).where(eq(chatMessages.orderId, id));
    await db.update(notifications).set({ orderId: null }).where(eq(notifications.orderId, id));
    await db.update(customerInbox).set({ orderId: null }).where(eq(customerInbox.orderId, id));
    await db.update(walletTransactions).set({ orderId: null }).where(eq(walletTransactions.orderId, id));
    await db.update(loyaltyTransactions).set({ orderId: null }).where(eq(loyaltyTransactions.orderId, id));
    await db.delete(orders).where(eq(orders.id, id));
    return true;
  }

  async getOrderStats(): Promise<{ totalOrders: number; pendingOrders: number; completedOrders: number; totalRevenue: number; todayOrders: number }> {
    const allOrders = await db.select().from(orders);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
    const completedOrders = allOrders.filter(o => o.status === 'completed').length;
    const totalRevenue = allOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
    const todayOrders = allOrders.filter(o => o.createdAt && new Date(o.createdAt) >= today).length;

    return { totalOrders, pendingOrders, completedOrders, totalRevenue, todayOrders };
  }

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(courses.sortOrder);
  }

  async getCourseById(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db.insert(courses).values(course).returning();
    return newCourse;
  }

  async updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updated] = await db.update(courses).set(course).where(eq(courses.id, id)).returning();
    return updated || undefined;
  }

  async deleteCourse(id: string): Promise<boolean> {
    await db.delete(courses).where(eq(courses.id, id));
    return true;
  }

  async getAccounts(): Promise<(Account & { game?: Game })[]> {
    const accountsData = await db.select().from(accounts).orderBy(desc(accounts.createdAt));
    const result = await Promise.all(accountsData.map(async (account) => {
      const [game] = account.gameId
        ? await db.select().from(games).where(eq(games.id, account.gameId))
        : [undefined];
      return { ...account, game };
    }));
    return result;
  }

  async getAccountById(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account || undefined;
  }

  async getAccountsByGameId(gameId: string): Promise<Account[]> {
    return db.select().from(accounts).where(and(eq(accounts.gameId, gameId), eq(accounts.isActive, true), eq(accounts.isSold, false)));
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: string, account: Partial<InsertAccount>): Promise<Account | undefined> {
    const [updated] = await db.update(accounts).set(account).where(eq(accounts.id, id)).returning();
    return updated || undefined;
  }

  async deleteAccount(id: string): Promise<boolean> {
    await db.delete(accounts).where(eq(accounts.id, id));
    return true;
  }

  async getAccountSellRequests(status?: string): Promise<(AccountSellRequest & { game?: Game })[]> {
    let query = db.select().from(accountSellRequests).orderBy(desc(accountSellRequests.createdAt));
    const rows = status
      ? await db.select().from(accountSellRequests).where(eq(accountSellRequests.status, status)).orderBy(desc(accountSellRequests.createdAt))
      : await query;
    return Promise.all(rows.map(async (req) => {
      const [game] = req.gameId
        ? await db.select().from(games).where(eq(games.id, req.gameId))
        : [undefined];
      return { ...req, game };
    }));
  }

  async getAccountSellRequestById(id: string): Promise<AccountSellRequest | undefined> {
    const [req] = await db.select().from(accountSellRequests).where(eq(accountSellRequests.id, id));
    return req || undefined;
  }

  async createAccountSellRequest(req: InsertAccountSellRequest): Promise<AccountSellRequest> {
    const [newReq] = await db.insert(accountSellRequests).values(req).returning();
    return newReq;
  }

  async updateAccountSellRequestStatus(id: string, status: string, adminNote?: string, approvedAccountId?: string): Promise<AccountSellRequest | undefined> {
    const updateData: any = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (approvedAccountId !== undefined) updateData.approvedAccountId = approvedAccountId;
    const [updated] = await db.update(accountSellRequests).set(updateData).where(eq(accountSellRequests.id, id)).returning();
    return updated || undefined;
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder);
  }

  async createPaymentMethod(method: InsertPaymentMethod): Promise<PaymentMethod> {
    const [newMethod] = await db.insert(paymentMethods).values(method).returning();
    return newMethod;
  }

  async updatePaymentMethod(id: string, method: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [updated] = await db.update(paymentMethods).set(method).where(eq(paymentMethods.id, id)).returning();
    return updated || undefined;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return true;
  }

  async getNotifications(): Promise<Notification[]> {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
  }

  async getUnreadNotificationsCount(): Promise<number> {
    const result = await db.select().from(notifications).where(eq(notifications.isRead, false));
    return result.length;
  }

  async getSettings(): Promise<Setting[]> {
    return db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings).set({ value }).where(eq(settings.key, key)).returning();
      return updated;
    } else {
      const [newSetting] = await db.insert(settings).values({ key, value }).returning();
      return newSetting;
    }
  }

  async getChatMessages(orderId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.orderId, orderId)).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const [newMsg] = await db.insert(chatMessages).values(msg).returning();
    return newMsg;
  }

  async markChatMessagesRead(orderId: string, senderType: string): Promise<void> {
    await db.update(chatMessages).set({ isRead: true }).where(and(eq(chatMessages.orderId, orderId), eq(chatMessages.senderType, senderType)));
  }

  async getUnreadChatCount(senderType: string): Promise<number> {
    const result = await db.select().from(chatMessages).where(and(eq(chatMessages.senderType, senderType), eq(chatMessages.isRead, false)));
    return result.length;
  }

  async getSupportMessages(customerId: string): Promise<SupportMessage[]> {
    return db.select().from(supportMessages).where(eq(supportMessages.customerId, customerId)).orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(msg: InsertSupportMessage): Promise<SupportMessage> {
    const [newMsg] = await db.insert(supportMessages).values(msg).returning();
    return newMsg;
  }

  async markSupportMessagesRead(customerId: string, senderType: string): Promise<void> {
    await db.update(supportMessages).set({ isRead: true }).where(
      and(eq(supportMessages.customerId, customerId), eq(supportMessages.senderType, senderType))
    );
  }

  async getSupportConversations(): Promise<{ customerId: string; lastMessage: string; lastAt: Date; unreadCount: number; customer?: any }[]> {
    const allMsgs = await db.select().from(supportMessages).orderBy(desc(supportMessages.createdAt));
    const allCustomers = await db.select().from(customers);
    const custMap = new Map(allCustomers.map(c => [c.id, c]));
    const convMap = new Map<string, { customerId: string; lastMessage: string; lastAt: Date; unreadCount: number; customer?: any }>();
    for (const msg of allMsgs) {
      if (!convMap.has(msg.customerId)) {
        const unread = allMsgs.filter(m => m.customerId === msg.customerId && m.senderType === "customer" && !m.isRead).length;
        convMap.set(msg.customerId, {
          customerId: msg.customerId,
          lastMessage: msg.message,
          lastAt: msg.createdAt!,
          unreadCount: unread,
          customer: custMap.get(msg.customerId),
        });
      }
    }
    return Array.from(convMap.values()).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }

  async getUnreadSupportCount(): Promise<number> {
    const result = await db.select().from(supportMessages).where(and(eq(supportMessages.senderType, "customer"), eq(supportMessages.isRead, false)));
    return result.length;
  }

  async getCustomerInbox(phone: string): Promise<CustomerInbox[]> {
    return db.select().from(customerInbox).where(eq(customerInbox.customerPhone, phone)).orderBy(desc(customerInbox.createdAt));
  }

  async createCustomerInboxMessage(msg: InsertCustomerInbox): Promise<CustomerInbox> {
    const [newMsg] = await db.insert(customerInbox).values(msg).returning();
    return newMsg;
  }

  async markInboxRead(id: string): Promise<void> {
    await db.update(customerInbox).set({ isRead: true }).where(eq(customerInbox.id, id));
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order || undefined;
  }

  async getOrdersByPhone(phone: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.customerPhone, phone)).orderBy(desc(orders.createdAt));
  }

  async getAccountOrders(filters?: { customerId?: string; status?: string }): Promise<any[]> {
    const ordersData = await db.select().from(orders)
      .where(eq(orders.orderType, "account"))
      .orderBy(desc(orders.createdAt));
    const result = await Promise.all(ordersData.map(async (order) => {
      let account = undefined;
      if (order.accountId) {
        const [a] = await db.select().from(accounts).where(eq(accounts.id, order.accountId));
        account = a;
      }
      let customer = undefined;
      if (order.customerId) {
        const [c] = await db.select().from(customers).where(eq(customers.id, order.customerId));
        customer = c;
      }
      return { ...order, account, customer };
    }));
    if (filters?.customerId) return result.filter(o => o.customerId === filters.customerId);
    if (filters?.status) return result.filter(o => o.accountOrderStatus === filters.status || o.status === filters.status);
    return result;
  }

  async updateAccountOrderStatus(id: string, data: { accountOrderStatus?: string; credentialsDelivered?: string; vodafoneCashNumber?: string; payoutStatus?: string; status?: string; notes?: string; paymentProofUrl?: string; senderPhone?: string }): Promise<Order | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.accountOrderStatus !== undefined) updateData.accountOrderStatus = data.accountOrderStatus;
    if (data.credentialsDelivered !== undefined) updateData.credentialsDelivered = data.credentialsDelivered;
    if (data.vodafoneCashNumber !== undefined) updateData.vodafoneCashNumber = data.vodafoneCashNumber;
    if (data.payoutStatus !== undefined) updateData.payoutStatus = data.payoutStatus;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.paymentProofUrl !== undefined) updateData.paymentProofUrl = data.paymentProofUrl;
    if (data.senderPhone !== undefined) updateData.senderPhone = data.senderPhone;
    const [updated] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  async saveUploadedFile(filename: string, data: string, contentType: string): Promise<void> {
    await db.insert(uploadedFiles).values({ filename, data, contentType }).onConflictDoUpdate({
      target: uploadedFiles.filename,
      set: { data, contentType },
    });
  }

  async getUploadedFile(filename: string): Promise<{ data: string; contentType: string } | null> {
    const [file] = await db.select({ data: uploadedFiles.data, contentType: uploadedFiles.contentType })
      .from(uploadedFiles).where(eq(uploadedFiles.filename, filename));
    return file || null;
  }

  async getCustomerByReferralCode(code: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.referralCode, code));
    return customer || undefined;
  }

  async getCustomerByGoogleId(googleId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.googleId, googleId));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async getCustomerByUsername(username: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.username, username));
    return customer || undefined;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomerStats(): Promise<{ totalCustomers: number; totalBalance: number; activeCustomers: number }> {
    const allCustomers = await db.select().from(customers);
    const totalCustomers = allCustomers.length;
    const totalBalance = allCustomers.reduce((sum, c) => sum + (c.balance || 0), 0);
    const activeCustomers = allCustomers.filter(c => c.username).length;
    return { totalCustomers, totalBalance, activeCustomers };
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.phone, phone));
    return customer || undefined;
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const referralCode = customer.referralCode || generateReferralCode();
    const [newCustomer] = await db.insert(customers).values({ ...customer, referralCode }).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, data: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return updated || undefined;
  }

  async createCustomerSession(session: InsertCustomerSession): Promise<CustomerSession> {
    const [newSession] = await db.insert(customerSessions).values(session).returning();
    return newSession;
  }

  async getCustomerByToken(token: string): Promise<Customer | undefined> {
    const [session] = await db.select().from(customerSessions).where(and(eq(customerSessions.token, token), sql`${customerSessions.expiresAt} > now()`));
    if (!session) return undefined;
    const [customer] = await db.select().from(customers).where(eq(customers.id, session.customerId));
    return customer || undefined;
  }

  async deleteCustomerSession(token: string): Promise<void> {
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
  }

  async deleteCustomerSessionsByCustomerId(customerId: string): Promise<void> {
    await db.delete(customerSessions).where(eq(customerSessions.customerId, customerId));
  }

  async getCustomerGameIds(customerId: string): Promise<(CustomerGameId & { game?: Game })[]> {
    const gameIdsData = await db.select().from(customerGameIds).where(eq(customerGameIds.customerId, customerId));
    const result = await Promise.all(gameIdsData.map(async (gid) => {
      const [game] = await db.select().from(games).where(eq(games.id, gid.gameId));
      return { ...gid, game };
    }));
    return result;
  }

  async upsertCustomerGameId(data: InsertCustomerGameId): Promise<CustomerGameId> {
    const existing = await db.select().from(customerGameIds).where(and(eq(customerGameIds.customerId, data.customerId), eq(customerGameIds.gameId, data.gameId)));
    if (existing.length > 0) {
      const [updated] = await db.update(customerGameIds).set({ playerId: data.playerId, lastUsedAt: new Date() }).where(eq(customerGameIds.id, existing[0].id)).returning();
      return updated;
    }
    const [newId] = await db.insert(customerGameIds).values(data).returning();
    return newId;
  }

  async getWalletTransactions(customerId: string): Promise<WalletTransaction[]> {
    return db.select().from(walletTransactions).where(eq(walletTransactions.customerId, customerId)).orderBy(desc(walletTransactions.createdAt));
  }

  async createWalletTransaction(tx: InsertWalletTransaction): Promise<WalletTransaction> {
    const [newTx] = await db.insert(walletTransactions).values(tx).returning();
    if (tx.type === "credit") {
      await db.update(customers).set({ balance: sql`balance + ${tx.amount}` }).where(eq(customers.id, tx.customerId));
    } else {
      await db.update(customers).set({ balance: sql`balance - ${tx.amount}` }).where(eq(customers.id, tx.customerId));
    }
    return newTx;
  }

  async getLoyaltyTransactions(customerId: string): Promise<LoyaltyTransaction[]> {
    return db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.customerId, customerId)).orderBy(desc(loyaltyTransactions.createdAt));
  }

  async createLoyaltyTransaction(tx: InsertLoyaltyTransaction): Promise<LoyaltyTransaction> {
    const [newTx] = await db.insert(loyaltyTransactions).values(tx).returning();
    if (tx.type === "credit") {
      await db.update(customers).set({ loyaltyPoints: sql`loyalty_points + ${tx.points}` }).where(eq(customers.id, tx.customerId));
    } else {
      await db.update(customers).set({ loyaltyPoints: sql`loyalty_points - ${tx.points}` }).where(eq(customers.id, tx.customerId));
    }
    return newTx;
  }

  async getWalletRequests(status?: string): Promise<WalletRequest[]> {
    if (status) {
      return db.select().from(walletRequests).where(eq(walletRequests.status, status)).orderBy(desc(walletRequests.createdAt));
    }
    return db.select().from(walletRequests).orderBy(desc(walletRequests.createdAt));
  }

  async getWalletRequestById(id: string): Promise<WalletRequest | undefined> {
    const [req] = await db.select().from(walletRequests).where(eq(walletRequests.id, id));
    return req || undefined;
  }

  async getWalletRequestsByCustomerId(customerId: string): Promise<WalletRequest[]> {
    return db.select().from(walletRequests).where(eq(walletRequests.customerId, customerId)).orderBy(desc(walletRequests.createdAt));
  }

  async createWalletRequest(req: InsertWalletRequest): Promise<WalletRequest> {
    const [newReq] = await db.insert(walletRequests).values(req).returning();
    await this.createNotification({
      type: "wallet_request",
      title: "طلب إيداع جديد",
      message: `طلب إيداع ${req.amount} جنيه من ${req.customerName}`,
    });
    return newReq;
  }

  async updateWalletRequestStatus(id: string, status: string, adminNote?: string): Promise<WalletRequest | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (adminNote !== undefined) updates.adminNote = adminNote;
    const [updated] = await db.update(walletRequests).set(updates).where(eq(walletRequests.id, id)).returning();
    return updated || undefined;
  }

  async getCustomerInboxByCustomerId(customerId: string): Promise<CustomerInbox[]> {
    return db.select().from(customerInbox).where(eq(customerInbox.customerId, customerId)).orderBy(desc(customerInbox.createdAt));
  }

  async getOrdersByCustomerPhone(phone: string): Promise<any[]> {
    const ordersData = await db.select().from(orders).where(eq(orders.customerPhone, phone)).orderBy(desc(orders.createdAt));
    const result = await Promise.all(ordersData.map(async (order) => {
      let game, pkg;
      if (order.gameId) {
        [game] = await db.select().from(games).where(eq(games.id, order.gameId));
      }
      if (order.packageId) {
        [pkg] = await db.select().from(packages).where(eq(packages.id, order.packageId));
      }
      return { ...order, game, package: pkg };
    }));
    return result;
  }

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    const [existing] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
    if (existing) {
      const [updated] = await db.update(pushSubscriptions).set({ p256dh: sub.p256dh, auth: sub.auth, customerId: sub.customerId }).where(eq(pushSubscriptions.endpoint, sub.endpoint)).returning();
      return updated;
    }
    const [created] = await db.insert(pushSubscriptions).values(sub).returning();
    return created;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async getPushSubscriptionsByCustomerId(customerId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.customerId, customerId));
  }

  async sendPushNotification(customerId: string, payload: { title: string; body: string; url?: string; tag?: string }): Promise<void> {
    try {
      const subs = await this.getPushSubscriptionsByCustomerId(customerId);
      const payloadStr = JSON.stringify(payload);
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payloadStr);
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await this.deletePushSubscription(sub.endpoint);
            }
          }
        })
      );
    } catch {}
  }

  async trackEvent(eventType: string, target: string, meta?: string): Promise<void> {
    await db.insert(analyticsEvents).values({ eventType, target, meta: meta || null });
  }

  async getAnalyticsOverview(): Promise<any> {
    const allOrders = await db.select().from(orders);
    const allCustomers = await db.select().from(customers);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const yearStart = new Date(now); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);

    const completed = allOrders.filter(o => o.status === "completed");
    const filterByPeriod = (arr: any[], field: string, start: Date) =>
      arr.filter(o => o[field] && new Date(o[field]) >= start);

    const ordersToday = filterByPeriod(allOrders, "createdAt", todayStart).length;
    const ordersWeek = filterByPeriod(allOrders, "createdAt", weekStart).length;
    const ordersMonth = filterByPeriod(allOrders, "createdAt", monthStart).length;
    const ordersYear = filterByPeriod(allOrders, "createdAt", yearStart).length;

    const revenueToday = filterByPeriod(completed, "createdAt", todayStart).reduce((s,o)=>s+o.totalAmount,0);
    const revenueWeek = filterByPeriod(completed, "createdAt", weekStart).reduce((s,o)=>s+o.totalAmount,0);
    const revenueMonth = filterByPeriod(completed, "createdAt", monthStart).reduce((s,o)=>s+o.totalAmount,0);
    const revenueYear = filterByPeriod(completed, "createdAt", yearStart).reduce((s,o)=>s+o.totalAmount,0);

    const usersToday = filterByPeriod(allCustomers, "createdAt", todayStart).length;
    const usersWeek = filterByPeriod(allCustomers, "createdAt", weekStart).length;
    const usersMonth = filterByPeriod(allCustomers, "createdAt", monthStart).length;
    const usersYear = filterByPeriod(allCustomers, "createdAt", yearStart).length;

    const allEvents = await db.select().from(analyticsEvents).where(eq(analyticsEvents.eventType, "page_view"));
    const visitorsToday = filterByPeriod(allEvents, "createdAt", todayStart).length;
    const visitorsWeek = filterByPeriod(allEvents, "createdAt", weekStart).length;
    const visitorsMonth = filterByPeriod(allEvents, "createdAt", monthStart).length;
    const visitorsYear = filterByPeriod(allEvents, "createdAt", yearStart).length;

    const last30Days: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now); day.setDate(now.getDate() - i); day.setHours(0,0,0,0);
      const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);
      const dayOrders = allOrders.filter(o => o.createdAt && new Date(o.createdAt) >= day && new Date(o.createdAt) <= dayEnd);
      const dayRevenue = dayOrders.filter(o=>o.status==="completed").reduce((s,o)=>s+o.totalAmount,0);
      last30Days.push({ date: day.toISOString().split("T")[0], orders: dayOrders.length, revenue: dayRevenue });
    }

    return {
      orders: { today: ordersToday, week: ordersWeek, month: ordersMonth, year: ordersYear },
      revenue: { today: revenueToday, week: revenueWeek, month: revenueMonth, year: revenueYear },
      visitors: { today: visitorsToday, week: visitorsWeek, month: visitorsMonth, year: visitorsYear },
      users: { today: usersToday, week: usersWeek, month: usersMonth, year: usersYear },
      chart: last30Days,
    };
  }

  async getTopGames(): Promise<any[]> {
    const allOrders = await db.select().from(orders);
    const allGames = await db.select().from(games);
    const gameMap = new Map(allGames.map(g => [g.id, g]));
    const stats: Record<string, { count: number; revenue: number }> = {};
    for (const order of allOrders) {
      if (!order.gameId) continue;
      if (!stats[order.gameId]) stats[order.gameId] = { count: 0, revenue: 0 };
      stats[order.gameId].count++;
      if (order.status === "completed") stats[order.gameId].revenue += order.totalAmount;
    }
    return Object.entries(stats)
      .map(([gameId, s]) => ({ gameId, game: gameMap.get(gameId), ...s }))
      .filter(x => x.game)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  async getTopPackages(): Promise<any[]> {
    const allOrders = await db.select().from(orders);
    const allPackages = await db.select().from(packages);
    const allGames = await db.select().from(games);
    const pkgMap = new Map(allPackages.map(p => [p.id, p]));
    const gameMap = new Map(allGames.map(g => [g.id, g]));
    const stats: Record<string, { count: number; revenue: number }> = {};
    for (const order of allOrders) {
      if (!order.packageId) continue;
      if (!stats[order.packageId]) stats[order.packageId] = { count: 0, revenue: 0 };
      stats[order.packageId].count++;
      if (order.status === "completed") stats[order.packageId].revenue += order.totalAmount;
    }
    return Object.entries(stats)
      .map(([pkgId, s]) => {
        const pkg = pkgMap.get(pkgId);
        if (!pkg) return null;
        return { packageId: pkgId, package: pkg, game: gameMap.get(pkg.gameId), ...s };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 20);
  }

  async getCustomerActivity(): Promise<any[]> {
    const allCustomers = await db.select().from(customers);
    const allOrders = await db.select().from(orders);
    const allGames = await db.select().from(games);
    const gameMap = new Map(allGames.map(g => [g.id, g]));
    return allCustomers.map(c => {
      const cOrders = allOrders.filter(o => o.customerId === c.id || o.customerPhone === c.phone);
      const completed = cOrders.filter(o => o.status === "completed");
      const totalSpent = completed.reduce((s, o) => s + o.totalAmount, 0);
      const lastOrder = cOrders.sort((a,b)=>(b.createdAt?.getTime()||0)-(a.createdAt?.getTime()||0))[0];
      const gameCount: Record<string,number> = {};
      cOrders.forEach(o => { if (o.gameId) gameCount[o.gameId] = (gameCount[o.gameId]||0)+1; });
      const topGame = Object.entries(gameCount).sort((a,b)=>b[1]-a[1])[0];
      return {
        id: c.id, name: c.name, username: c.username, phone: c.phone,
        orderCount: cOrders.length, completedCount: completed.length,
        totalSpent, lastOrderAt: lastOrder?.createdAt || null,
        topGame: topGame ? gameMap.get(topGame[0])?.nameAr : null,
      };
    }).filter(c => c.orderCount > 0).sort((a,b) => b.totalSpent - a.totalSpent);
  }

  async getTopCustomers(): Promise<any[]> {
    const activity = await this.getCustomerActivity();
    return activity.slice(0, 20);
  }

  async getNewUsersStats(): Promise<any> {
    const allCustomers = await db.select().from(customers);
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate()-7); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const yearStart = new Date(now); yearStart.setMonth(0,1); yearStart.setHours(0,0,0,0);
    const f = (start: Date) => allCustomers.filter(c => c.createdAt && new Date(c.createdAt) >= start).length;
    return { today: f(todayStart), week: f(weekStart), month: f(monthStart), year: f(yearStart), total: allCustomers.length };
  }

  async getBehaviorStats(): Promise<any> {
    const allEvents = await db.select().from(analyticsEvents);
    const gameOpens: Record<string,number> = {};
    const packageClicks: Record<string,number> = {};
    const pageViews: Record<string,number> = {};
    for (const ev of allEvents) {
      if (ev.eventType === "game_open") gameOpens[ev.target] = (gameOpens[ev.target]||0)+1;
      else if (ev.eventType === "package_click") packageClicks[ev.target] = (packageClicks[ev.target]||0)+1;
      else if (ev.eventType === "page_view") pageViews[ev.target] = (pageViews[ev.target]||0)+1;
    }
    const sortObj = (obj: Record<string,number>) =>
      Object.entries(obj).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({target:k,count:v}));
    return { gameOpens: sortObj(gameOpens).slice(0,10), packageClicks: sortObj(packageClicks).slice(0,10), pageViews: sortObj(pageViews).slice(0,10) };
  }

  async getCommunityPosts(includeAll = false): Promise<(CommunityPost & { commentCount: number })[]> {
    const posts = includeAll
      ? await db.select().from(communityPosts).orderBy(desc(communityPosts.createdAt))
      : await db.select().from(communityPosts).where(eq(communityPosts.status, "published")).orderBy(desc(communityPosts.createdAt));
    const result = await Promise.all(posts.map(async (post) => {
      const [{ cnt }] = await db.select({ cnt: count() }).from(postComments).where(and(eq(postComments.postId, post.id), eq(postComments.isHidden, false)));
      return { ...post, commentCount: cnt };
    }));
    return result;
  }

  async getCommunityPostById(id: string): Promise<(CommunityPost & { commentCount: number }) | undefined> {
    const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, id));
    if (!post) return undefined;
    const [{ cnt }] = await db.select({ cnt: count() }).from(postComments).where(and(eq(postComments.postId, id), eq(postComments.isHidden, false)));
    return { ...post, commentCount: cnt };
  }

  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [newPost] = await db.insert(communityPosts).values(post).returning();
    return newPost;
  }

  async updateCommunityPost(id: string, post: Partial<InsertCommunityPost>): Promise<CommunityPost | undefined> {
    const [updated] = await db.update(communityPosts).set({ ...post, updatedAt: new Date() }).where(eq(communityPosts.id, id)).returning();
    return updated || undefined;
  }

  async deleteCommunityPost(id: string): Promise<boolean> {
    await db.delete(communityPosts).where(eq(communityPosts.id, id));
    return true;
  }

  async getPostComments(postId: string, includeHidden = false): Promise<PostComment[]> {
    if (includeHidden) {
      return db.select().from(postComments).where(eq(postComments.postId, postId)).orderBy(desc(postComments.createdAt));
    }
    return db.select().from(postComments).where(and(eq(postComments.postId, postId), eq(postComments.isHidden, false))).orderBy(desc(postComments.createdAt));
  }

  async getAllPostComments(filters?: { postId?: string }): Promise<(PostComment & { postTitle?: string })[]> {
    const allPosts = await db.select().from(communityPosts);
    const postMap = new Map(allPosts.map(p => [p.id, p.title]));
    const comments = filters?.postId
      ? await db.select().from(postComments).where(eq(postComments.postId, filters.postId)).orderBy(desc(postComments.createdAt))
      : await db.select().from(postComments).orderBy(desc(postComments.createdAt));
    return comments.map(c => ({ ...c, postTitle: postMap.get(c.postId) }));
  }

  async createPostComment(comment: InsertPostComment): Promise<PostComment> {
    const [newComment] = await db.insert(postComments).values(comment).returning();
    return newComment;
  }

  async updatePostComment(id: string, data: Partial<InsertPostComment>): Promise<PostComment | undefined> {
    const [updated] = await db.update(postComments).set(data).where(eq(postComments.id, id)).returning();
    return updated || undefined;
  }

  async deletePostComment(id: string): Promise<boolean> {
    await db.delete(postComments).where(eq(postComments.id, id));
    return true;
  }

  async getLeaderboard(): Promise<{
    topShippers: { rank: number; customerId: string; name: string; username: string; orderCount: number; totalSpent: number }[];
    topBuyers: { rank: number; customerId: string; name: string; username: string; orderCount: number; totalSpent: number }[];
    topSellers: { rank: number; customerId: string; name: string; username: string; requestCount: number }[];
  }> {
    const topShippersRaw = await db
      .select({
        customerId: orders.customerId,
        orderCount: count(orders.id),
        totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.orderType, "topup"), eq(orders.status, "completed"), sql`${orders.customerId} IS NOT NULL`))
      .groupBy(orders.customerId)
      .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      .limit(10);

    const topBuyersRaw = await db
      .select({
        customerId: orders.customerId,
        orderCount: count(orders.id),
        totalSpent: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.orderType, "account"), eq(orders.status, "completed"), sql`${orders.customerId} IS NOT NULL`))
      .groupBy(orders.customerId)
      .orderBy(desc(sql`COUNT(${orders.id})`))
      .limit(10);

    const topSellersRaw = await db
      .select({
        sellerPhone: accountSellRequests.sellerPhone,
        requestCount: count(accountSellRequests.id),
      })
      .from(accountSellRequests)
      .where(eq(accountSellRequests.status, "approved"))
      .groupBy(accountSellRequests.sellerPhone)
      .orderBy(desc(count(accountSellRequests.id)))
      .limit(10);

    const allIds = [
      ...topShippersRaw.map(r => r.customerId!),
      ...topBuyersRaw.map(r => r.customerId!),
    ].filter(Boolean);
    const phones = topSellersRaw.map(r => r.sellerPhone).filter(Boolean);

    const customerMap: Record<string, { name: string; username: string }> = {};
    if (allIds.length > 0) {
      const cusRows = await db.select({ id: customers.id, name: customers.name, username: customers.username })
        .from(customers)
        .where(sql`${customers.id} = ANY(ARRAY[${sql.join(allIds.map(id => sql`${id}`), sql`, `)}]::text[])`);
      for (const c of cusRows) customerMap[c.id] = { name: c.name || "", username: c.username || "" };
    }

    const phoneCustomerMap: Record<string, { id: string; name: string; username: string }> = {};
    if (phones.length > 0) {
      const phoneRows = await db.select({ id: customers.id, phone: customers.phone, name: customers.name, username: customers.username })
        .from(customers)
        .where(sql`${customers.phone} = ANY(ARRAY[${sql.join(phones.map(p => sql`${p}`), sql`, `)}]::text[])`);
      for (const c of phoneRows) phoneCustomerMap[c.phone || ""] = { id: c.id, name: c.name || "", username: c.username || "" };
    }

    return {
      topShippers: topShippersRaw.map((r, i) => ({
        rank: i + 1,
        customerId: r.customerId || "",
        name: customerMap[r.customerId!]?.name || "—",
        username: customerMap[r.customerId!]?.username || "",
        orderCount: Number(r.orderCount),
        totalSpent: Number(r.totalSpent),
      })),
      topBuyers: topBuyersRaw.map((r, i) => ({
        rank: i + 1,
        customerId: r.customerId || "",
        name: customerMap[r.customerId!]?.name || "—",
        username: customerMap[r.customerId!]?.username || "",
        orderCount: Number(r.orderCount),
        totalSpent: Number(r.totalSpent),
      })),
      topSellers: topSellersRaw.map((r, i) => {
        const cus = phoneCustomerMap[r.sellerPhone] || { id: "", name: "—", username: "" };
        return {
          rank: i + 1,
          customerId: cus.id,
          name: cus.name,
          username: cus.username,
          requestCount: Number(r.requestCount),
        };
      }),
    };
  }

  // ─── Admin Users ────────────────────────────────────────────────────────────
  async getAdminUsers(): Promise<AdminUser[]> {
    return db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
  }
  async getAdminUserById(id: string): Promise<AdminUser | undefined> {
    const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return u || undefined;
  }
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [u] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return u || undefined;
  }
  async getAdminUserByGoogleId(googleId: string): Promise<AdminUser | undefined> {
    const [u] = await db.select().from(adminUsers).where(eq(adminUsers.googleId, googleId));
    return u || undefined;
  }
  async createAdminUser(user: InsertAdminUser): Promise<AdminUser> {
    const [u] = await db.insert(adminUsers).values(user).returning();
    return u;
  }
  async updateAdminUser(id: string, data: Partial<InsertAdminUser>): Promise<AdminUser | undefined> {
    const [u] = await db.update(adminUsers).set(data).where(eq(adminUsers.id, id)).returning();
    return u || undefined;
  }
  async deleteAdminUser(id: string): Promise<boolean> {
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return true;
  }

  // ─── Discount Codes ─────────────────────────────────────────────────────────
  async getDiscountCodes(): Promise<DiscountCode[]> {
    return db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
  }
  async getDiscountCodeById(id: string): Promise<DiscountCode | undefined> {
    const [c] = await db.select().from(discountCodes).where(eq(discountCodes.id, id));
    return c || undefined;
  }
  async getDiscountCodeByCode(code: string): Promise<DiscountCode | undefined> {
    const [c] = await db.select().from(discountCodes).where(eq(discountCodes.code, code.toUpperCase()));
    return c || undefined;
  }
  async createDiscountCode(code: InsertDiscountCode): Promise<DiscountCode> {
    const [c] = await db.insert(discountCodes).values({ ...code, code: code.code.toUpperCase() }).returning();
    return c;
  }
  async updateDiscountCode(id: string, data: Partial<InsertDiscountCode>): Promise<DiscountCode | undefined> {
    const updateData: any = { ...data };
    if (data.code) updateData.code = data.code.toUpperCase();
    const [c] = await db.update(discountCodes).set(updateData).where(eq(discountCodes.id, id)).returning();
    return c || undefined;
  }
  async deleteDiscountCode(id: string): Promise<boolean> {
    await db.delete(discountCodes).where(eq(discountCodes.id, id));
    return true;
  }
  async incrementDiscountCodeUsage(id: string): Promise<void> {
    await db.update(discountCodes).set({ usedCount: sql`${discountCodes.usedCount} + 1` }).where(eq(discountCodes.id, id));
  }

  async seedData(): Promise<void> {
    try {
      await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email text`);
      await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_id text UNIQUE`);
      await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'local'`);
      await db.execute(sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT true`);
      await db.execute(sql`ALTER TABLE virtual_number_orders ADD COLUMN IF NOT EXISTS payment_proof_url text`);
      await db.execute(sql`ALTER TABLE broker_requests ADD COLUMN IF NOT EXISTS payment_proof_url text`);
      // Admin users table
      await db.execute(sql`CREATE TABLE IF NOT EXISTS admin_users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password text,
        name text NOT NULL,
        role text NOT NULL DEFAULT 'moderator',
        google_id text UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp DEFAULT now()
      )`);
      // Discount codes table
      await db.execute(sql`CREATE TABLE IF NOT EXISTS discount_codes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE,
        name text,
        discount_type text NOT NULL DEFAULT 'percent',
        discount_value integer NOT NULL,
        scope text NOT NULL DEFAULT 'all_games',
        game_id varchar,
        max_uses integer,
        used_count integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        expires_at timestamp,
        created_at timestamp DEFAULT now()
      )`);
    } catch (e) {
      console.log("Migration note:", e);
    }

    // Seed admin users
    try {
      const bcrypt = await import("bcryptjs");
      const existingEyad = await this.getAdminUserByEmail("eyadmuhammed2011@gmail.com");
      if (!existingEyad) {
        const hashedPw = await bcrypt.hash("Aa159357@#", 10);
        await this.createAdminUser({ email: "eyadmuhammed2011@gmail.com", password: hashedPw, name: "Eyad", role: "super_admin", isActive: true });
      }
      const existingUnix = await this.getAdminUserByEmail("unixonda@gmail.com");
      if (!existingUnix) {
        await this.createAdminUser({ email: "unixonda@gmail.com", password: null, name: "Unix Admin", role: "super_admin", isActive: true });
      }
    } catch (e) {
      console.log("Admin seed note:", e);
    }

    // Payment methods: no auto-seed — admin manages them manually

    const coursesData = [
      { title: "كورس احتراف PUBG", description: "تعلم أسرار واستراتيجيات اللعب الاحترافي", price: 150, icon: "🎯", features: ["30 درس فيديو", "شهادة إتمام", "دعم مباشر"] },
      { title: "كورس FIFA Mobile", description: "من المبتدئ إلى المحترف", price: 120, icon: "⚽", features: ["25 درس", "تمارين عملية", "مجموعة خاصة"] },
    ];

    for (let i = 0; i < coursesData.length; i++) {
      await this.createCourse({ ...coursesData[i], sortOrder: i });
    }

    // Seed default games only if DB is empty
    await this.seedDefaultGames();

    console.log("Database seeded successfully!");
  }

  async seedDefaultGames(): Promise<void> {
    try {
      const existing = await this.getGames();
      if (existing.length > 0) return; // already has games, skip

      const defaultGames = [
        { name: "PES (eFootball)", slug: "pes-mobile", icon: "⚽", color: "from-blue-500 to-indigo-600", loginType: "account", packages: [
          { name: "130 كوين", price: 60 }, { name: "300 كوين", price: 155 }, { name: "550 كوين", price: 240 },
          { name: "750 كوين", price: 350 }, { name: "1040 كوين", price: 450 }, { name: "2130 كوين", price: 940 },
          { name: "3250 كوين", price: 1350 }, { name: "5700 كوين", price: 2150 }, { name: "12800 كوين", price: 4600 },
        ]},
        { name: "روبلوكس", slug: "roblox", icon: "🎲", color: "from-red-600 to-rose-700", loginType: "account", packages: [
          { name: "40 Robux", price: 35 }, { name: "80 Robux", price: 55 }, { name: "160 Robux", price: 100 },
          { name: "400 Robux", price: 250 }, { name: "800 Robux", price: 450 }, { name: "1200 Robux", price: 650 },
          { name: "2400 Robux", price: 1300 }, { name: "4800 Robux", price: 2650 }, { name: "7200 Robux", price: 4000 },
        ]},
        { name: "ببجي الكورية", slug: "pubg-kr", icon: "🎮", color: "from-yellow-500 to-amber-600", loginType: "id", packages: [
          { name: "60 شدة", price: 70, category: "شدات ببجي الكورية" }, { name: "190 شدة", price: 220, category: "شدات ببجي الكورية" },
          { name: "310 شدة", price: 360, category: "شدات ببجي الكورية" }, { name: "380 شدة", price: 420, category: "شدات ببجي الكورية" },
          { name: "660 شدة", price: 600, category: "شدات ببجي الكورية" }, { name: "1800 شدة", price: 1450, category: "شدات ببجي الكورية" },
        ]},
        { name: "ببجي ID", slug: "pubg-id", icon: "🎮", color: "from-orange-500 to-amber-600", loginType: "id", packages: [
          { name: "30 شدة", price: 35, category: "شدات عن طريق الـ ID" }, { name: "60 شدة", price: 55, category: "شدات عن طريق الـ ID" },
          { name: "120 شدة", price: 110, category: "شدات عن طريق الـ ID" }, { name: "325 شدة", price: 245, category: "شدات عن طريق الـ ID" },
          { name: "385 شدة", price: 290, category: "شدات عن طريق الـ ID" }, { name: "660 شدة", price: 455, category: "شدات عن طريق الـ ID" },
          { name: "720 شدة", price: 500, category: "شدات عن طريق الـ ID" }, { name: "1800 شدة", price: 1160, category: "شدات عن طريق الـ ID" },
          { name: "3850 شدة", price: 2290, category: "شدات عن طريق الـ ID" }, { name: "5650 شدة", price: 3370, category: "شدات عن طريق الـ ID" },
          { name: "ازدهار 1$", price: 60, category: "عروض الازدهار" }, { name: "ازدهار 3$", price: 155, category: "عروض الازدهار" },
          { name: "ازدهار 5$", price: 255, category: "عروض الازدهار" }, { name: "برايم عادي", price: 60, category: "عروض البرايم" },
          { name: "برايم بلس", price: 480, category: "عروض البرايم" },
        ]},
        { name: "ببجي أكونت", slug: "pubg-account", icon: "🎮", color: "from-orange-600 to-red-700", loginType: "account", packages: [
          { name: "60 شدة", price: 55, category: "شحن عن طريق الأكونت" }, { name: "120 شدة", price: 110, category: "شحن عن طريق الأكونت" },
          { name: "190 شدة", price: 165, category: "شحن عن طريق الأكونت" }, { name: "325 شدة", price: 235, category: "شحن عن طريق الأكونت" },
          { name: "385 شدة", price: 380, category: "شحن عن طريق الأكونت" }, { name: "660 شدة", price: 445, category: "شحن عن طريق الأكونت" },
          { name: "1800 شدة", price: 1100, category: "شحن عن طريق الأكونت" }, { name: "3850 شدة", price: 2200, category: "شحن عن طريق الأكونت" },
          { name: "5650 شدة", price: 3340, category: "شحن عن طريق الأكونت" }, { name: "8100 شدة", price: 4350, category: "شحن عن طريق الأكونت" },
          { name: "ازدهار 1$", price: 55, category: "عروض الازدهار" }, { name: "ازدهار 3$", price: 145, category: "عروض الازدهار" },
          { name: "ازدهار 5$", price: 245, category: "عروض الازدهار" }, { name: "برايم عادي", price: 55, category: "عروض البرايم" },
          { name: "برايم بلس", price: 460, category: "عروض البرايم" },
        ]},
        { name: "عملات تيك توك", slug: "tiktok", icon: "🎵", color: "from-pink-500 to-rose-600", loginType: "account", packages: [
          { name: "70 Coins", price: 55 }, { name: "140 Coins", price: 110 }, { name: "350 Coins", price: 230 },
          { name: "700 Coins", price: 430 }, { name: "1000 Coins", price: 550 }, { name: "1400 Coins", price: 850 },
          { name: "2000 Coins", price: 1150 }, { name: "3500 Coins", price: 2150 }, { name: "7000 Coins", price: 4100 },
        ]},
        { name: "FC Points", slug: "fifa-mobile", icon: "⚽", color: "from-green-500 to-emerald-600", loginType: "account", packages: [
          { name: "40 FC Points", price: 35 }, { name: "100 FC Points", price: 75 }, { name: "750 FC Points", price: 230 },
          { name: "1500 FC Points", price: 450 }, { name: "3000 FC Points", price: 870 },
          { name: "7500 FC Points", price: 2100 }, { name: "15000 FC Points", price: 4200 },
        ]},
        { name: "فري فاير اكونت", slug: "freefire", icon: "🔥", color: "from-red-500 to-orange-600", loginType: "account", packages: [
          { name: "110 جوهرة", price: 50, category: "شحن عن طريق الاكونت" }, { name: "231 جوهرة", price: 100, category: "شحن عن طريق الاكونت" },
          { name: "310 جوهرة", price: 140, category: "شحن عن طريق الاكونت" }, { name: "520 جوهرة", price: 240, category: "شحن عن طريق الاكونت" },
          { name: "1060 جوهرة", price: 475, category: "شحن عن طريق الاكونت" }, { name: "2120 جوهرة", price: 950, category: "شحن عن طريق الاكونت" },
          { name: "2420 جوهرة", price: 1070, category: "شحن عن طريق الاكونت" }, { name: "4240 جوهرة", price: 1840, category: "شحن عن طريق الاكونت" },
          { name: "5500 جوهرة", price: 2400, category: "شحن عن طريق الاكونت" }, { name: "10600 جوهرة", price: 4600, category: "شحن عن طريق الاكونت" },
          { name: "عضوية اسبوعية مخففة", price: 40, category: "عضويات" }, { name: "عضوية أسبوعي", price: 80, category: "عضويات" },
          { name: "عضوية شهرية", price: 420, category: "عضويات" }, { name: "بويا باس اكاونت", price: 65, category: "بويا باس" },
          { name: "بويا باس تيم كود", price: 70, category: "بويا باس" }, { name: "دروب 16.99ج", price: 35, category: "دروبات" },
          { name: "دروب 34.99ج", price: 75, category: "دروبات" }, { name: "دروب 49.99ج", price: 45, category: "دروبات" },
          { name: "دروب 99.99ج", price: 90, category: "دروبات" },
        ]},
        { name: "فري فاير ID", slug: "freefire-id", icon: "🔥", color: "from-orange-600 to-red-700", loginType: "id", packages: [
          { name: "110 جوهرة", price: 55, category: "شحن عن طريق الـ ID" }, { name: "231 جوهرة", price: 110, category: "شحن عن طريق الـ ID" },
          { name: "341 جوهرة", price: 160, category: "شحن عن طريق الـ ID" }, { name: "583 جوهرة", price: 265, category: "شحن عن طريق الـ ID" },
          { name: "1023 جوهرة", price: 475, category: "شحن عن طريق الـ ID" }, { name: "1188 جوهرة", price: 530, category: "شحن عن طريق الـ ID" },
          { name: "2000 جوهرة", price: 890, category: "شحن عن طريق الـ ID" }, { name: "2398 جوهرة", price: 1000, category: "شحن عن طريق الـ ID" },
          { name: "4796 جوهرة", price: 1960, category: "شحن عن طريق الـ ID" }, { name: "5000 جوهرة", price: 2050, category: "شحن عن طريق الـ ID" },
          { name: "10000 جوهرة", price: 4000, category: "شحن عن طريق الـ ID" }, { name: "عضوية اسبوعية ID", price: 125, category: "عضويات" },
          { name: "عضوية شهرية ID", price: 565, category: "عضويات" }, { name: "عرض المستوي كامل ID", price: 200, category: "عرض المستوي" },
          { name: "عرض المستوي لفل6", price: 25, category: "عرض المستوي" }, { name: "عرض المستوي لفل 10", price: 40, category: "عرض المستوي" },
          { name: "عرض المستوي لفل 15", price: 40, category: "عرض المستوي" }, { name: "عرض المستوي لفل 20", price: 40, category: "عرض المستوي" },
          { name: "عرض المستوي لفل 25", price: 40, category: "عرض المستوي" }, { name: "عرض المستوي لفل 30", price: 60, category: "عرض المستوي" },
        ]},
      ];

      for (let gi = 0; gi < defaultGames.length; gi++) {
        const g = defaultGames[gi];
        const game = await this.createGame({
          name: g.name, nameAr: g.name, slug: g.slug, icon: g.icon,
          color: g.color, loginType: g.loginType, isActive: true, sortOrder: gi, image: null,
        });
        for (let pi = 0; pi < g.packages.length; pi++) {
          const p = g.packages[pi] as any;
          await this.createPackage({
            gameId: game.id, name: p.name, amount: p.name, price: p.price,
            originalPrice: null, category: p.category || null, loginType: g.loginType,
            isActive: true, sortOrder: pi,
          });
        }
      }
      console.log("Default games seeded!");
    } catch (e) {
      console.log("Games seed note:", e);
    }
  }

  // ── Competitions ─────────────────────────────────────────────────────────
  async getCompetitions(includeHidden = false): Promise<Competition[]> {
    if (includeHidden) return db.select().from(competitions).orderBy(desc(competitions.createdAt));
    return db.select().from(competitions).where(eq(competitions.isVisible, true)).orderBy(desc(competitions.createdAt));
  }
  async getCompetitionById(id: string): Promise<Competition | undefined> {
    const [row] = await db.select().from(competitions).where(eq(competitions.id, id));
    return row || undefined;
  }
  async createCompetition(comp: InsertCompetition): Promise<Competition> {
    const [row] = await db.insert(competitions).values(comp).returning();
    return row;
  }
  async updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined> {
    const [row] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return row || undefined;
  }
  async deleteCompetition(id: string): Promise<boolean> {
    await db.delete(competitions).where(eq(competitions.id, id));
    return true;
  }

  // ── Sardarb Items ─────────────────────────────────────────────────────────
  async getSardarbItems(): Promise<SardarbItem[]> {
    return db.select().from(sardarbItems).orderBy(sardarbItems.sortOrder, desc(sardarbItems.createdAt));
  }
  async getSardarbItemById(id: string): Promise<SardarbItem | undefined> {
    const [row] = await db.select().from(sardarbItems).where(eq(sardarbItems.id, id));
    return row || undefined;
  }
  async createSardarbItem(item: InsertSardarbItem): Promise<SardarbItem> {
    const [row] = await db.insert(sardarbItems).values(item).returning();
    return row;
  }
  async updateSardarbItem(id: string, data: Partial<InsertSardarbItem>): Promise<SardarbItem | undefined> {
    const [row] = await db.update(sardarbItems).set(data).where(eq(sardarbItems.id, id)).returning();
    return row || undefined;
  }
  async deleteSardarbItem(id: string): Promise<boolean> {
    await db.delete(sardarbItems).where(eq(sardarbItems.id, id));
    return true;
  }
  async getSardarbOrders(filters?: { customerId?: string; status?: string }): Promise<(SardarbOrder & { item?: SardarbItem })[]> {
    const rows = await db.select().from(sardarbOrders).orderBy(desc(sardarbOrders.createdAt));
    const itemIds = [...new Set(rows.map(r => r.itemId))];
    const items = itemIds.length ? await db.select().from(sardarbItems).where(sql`id = ANY(${itemIds})`) : [];
    const itemMap = new Map(items.map(i => [i.id, i]));
    return rows
      .filter(r => (!filters?.customerId || r.customerId === filters.customerId) && (!filters?.status || r.status === filters.status))
      .map(r => ({ ...r, item: itemMap.get(r.itemId) }));
  }
  async getSardarbOrderById(id: string): Promise<(SardarbOrder & { item?: SardarbItem }) | undefined> {
    const [row] = await db.select().from(sardarbOrders).where(eq(sardarbOrders.id, id));
    if (!row) return undefined;
    const item = await this.getSardarbItemById(row.itemId);
    return { ...row, item };
  }
  async createSardarbOrder(order: InsertSardarbOrder): Promise<SardarbOrder> {
    const orderNumber = `SD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const [row] = await db.insert(sardarbOrders).values({ ...order, orderNumber }).returning();
    return row;
  }
  async updateSardarbOrder(id: string, data: Partial<SardarbOrder>): Promise<SardarbOrder | undefined> {
    const [row] = await db.update(sardarbOrders).set(data).where(eq(sardarbOrders.id, id)).returning();
    return row || undefined;
  }

  // ── Virtual Numbers ───────────────────────────────────────────────────────
  async getVirtualNumberCountries(): Promise<VirtualNumberCountry[]> {
    return db.select().from(virtualNumberCountries).orderBy(virtualNumberCountries.sortOrder);
  }
  async getVirtualNumberCountryById(id: string): Promise<VirtualNumberCountry | undefined> {
    const [row] = await db.select().from(virtualNumberCountries).where(eq(virtualNumberCountries.id, id));
    return row || undefined;
  }
  async createVirtualNumberCountry(country: InsertVirtualNumberCountry): Promise<VirtualNumberCountry> {
    const [row] = await db.insert(virtualNumberCountries).values(country).returning();
    return row;
  }
  async updateVirtualNumberCountry(id: string, data: Partial<InsertVirtualNumberCountry>): Promise<VirtualNumberCountry | undefined> {
    const [row] = await db.update(virtualNumberCountries).set(data).where(eq(virtualNumberCountries.id, id)).returning();
    return row || undefined;
  }
  async deleteVirtualNumberCountry(id: string): Promise<boolean> {
    await db.delete(virtualNumberCountries).where(eq(virtualNumberCountries.id, id));
    return true;
  }
  async getVirtualNumberOrders(filters?: { customerId?: string; status?: string }): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]> {
    const rows = await db.select().from(virtualNumberOrders).orderBy(desc(virtualNumberOrders.createdAt));
    const countryIds = [...new Set(rows.map(r => r.countryId))];
    const countries = countryIds.length ? await db.select().from(virtualNumberCountries).where(sql`id = ANY(${countryIds})`) : [];
    const countryMap = new Map(countries.map(c => [c.id, c]));
    return rows
      .filter(r => (!filters?.customerId || r.customerId === filters.customerId) && (!filters?.status || r.status === filters.status))
      .map(r => ({ ...r, country: countryMap.get(r.countryId) }));
  }
  async getVirtualNumberOrderById(id: string): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry }) | undefined> {
    const [row] = await db.select().from(virtualNumberOrders).where(eq(virtualNumberOrders.id, id));
    if (!row) return undefined;
    const country = await this.getVirtualNumberCountryById(row.countryId);
    return { ...row, country };
  }
  async getVirtualNumberOrdersByCustomer(customerId: string): Promise<(VirtualNumberOrder & { country?: VirtualNumberCountry })[]> {
    return this.getVirtualNumberOrders({ customerId });
  }
  async createVirtualNumberOrder(order: InsertVirtualNumberOrder): Promise<VirtualNumberOrder> {
    const orderNumber = `VN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const [row] = await db.insert(virtualNumberOrders).values({ ...order, orderNumber }).returning();
    return row;
  }
  async updateVirtualNumberOrder(id: string, data: Partial<VirtualNumberOrder>): Promise<VirtualNumberOrder | undefined> {
    const [row] = await db.update(virtualNumberOrders).set(data).where(eq(virtualNumberOrders.id, id)).returning();
    return row || undefined;
  }

  // ── Broker System ────────────────────────────────────────────────────────────
  async getBrokerRequests(filters?: { status?: string; buyerId?: string }): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer })[]> {
    let rows: BrokerRequest[];
    if (filters?.status && filters?.buyerId) {
      rows = await db.select().from(brokerRequests).where(and(eq(brokerRequests.status, filters.status), eq(brokerRequests.buyerId as any, filters.buyerId))).orderBy(desc(brokerRequests.createdAt));
    } else if (filters?.status) {
      rows = await db.select().from(brokerRequests).where(eq(brokerRequests.status, filters.status)).orderBy(desc(brokerRequests.createdAt));
    } else if (filters?.buyerId) {
      rows = await db.select().from(brokerRequests).where(eq(brokerRequests.buyerId as any, filters.buyerId)).orderBy(desc(brokerRequests.createdAt));
    } else {
      rows = await db.select().from(brokerRequests).orderBy(desc(brokerRequests.createdAt));
    }
    return Promise.all(rows.map(async r => {
      const offer = r.matchedOfferId ? (await db.select().from(brokerOffers).where(eq(brokerOffers.id, r.matchedOfferId)))[0] : undefined;
      return { ...r, matchedOffer: offer };
    }));
  }
  async getBrokerRequestById(id: string): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer }) | undefined> {
    const [row] = await db.select().from(brokerRequests).where(eq(brokerRequests.id, id));
    if (!row) return undefined;
    const offer = row.matchedOfferId ? (await db.select().from(brokerOffers).where(eq(brokerOffers.id, row.matchedOfferId)))[0] : undefined;
    return { ...row, matchedOffer: offer };
  }
  async getBrokerRequestsByBuyer(buyerId: string): Promise<(BrokerRequest & { matchedOffer?: BrokerOffer })[]> {
    return this.getBrokerRequests({ buyerId });
  }
  async createBrokerRequest(req: InsertBrokerRequest): Promise<BrokerRequest> {
    const orderNumber = `BR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const [row] = await db.insert(brokerRequests).values({ ...req, orderNumber } as any).returning();
    return row;
  }
  async updateBrokerRequest(id: string, data: Partial<BrokerRequest>): Promise<BrokerRequest | undefined> {
    const [row] = await db.update(brokerRequests).set(data as any).where(eq(brokerRequests.id, id)).returning();
    return row || undefined;
  }
  async deleteBrokerRequest(id: string): Promise<boolean> {
    await db.delete(brokerRequests).where(eq(brokerRequests.id, id));
    return true;
  }
  async getBrokerOffers(filters?: { requestId?: string; sellerId?: string; status?: string }): Promise<BrokerOffer[]> {
    let rows: BrokerOffer[];
    if (filters?.requestId) {
      rows = await db.select().from(brokerOffers).where(eq(brokerOffers.requestId, filters.requestId)).orderBy(desc(brokerOffers.createdAt));
    } else if (filters?.sellerId) {
      rows = await db.select().from(brokerOffers).where(eq(brokerOffers.sellerId as any, filters.sellerId)).orderBy(desc(brokerOffers.createdAt));
    } else {
      rows = await db.select().from(brokerOffers).orderBy(desc(brokerOffers.createdAt));
    }
    if (filters?.status) rows = rows.filter(r => r.status === filters.status);
    return rows;
  }
  async getBrokerOfferById(id: string): Promise<BrokerOffer | undefined> {
    const [row] = await db.select().from(brokerOffers).where(eq(brokerOffers.id, id));
    return row || undefined;
  }
  async createBrokerOffer(offer: InsertBrokerOffer): Promise<BrokerOffer> {
    const [row] = await db.insert(brokerOffers).values(offer as any).returning();
    return row;
  }
  async updateBrokerOffer(id: string, data: Partial<BrokerOffer>): Promise<BrokerOffer | undefined> {
    const [row] = await db.update(brokerOffers).set(data as any).where(eq(brokerOffers.id, id)).returning();
    return row || undefined;
  }

  // ── Trust Pulse ──────────────────────────────────────────────────────────────
  async getRecentTrustPulseEvents(limit = 20): Promise<TrustPulseEvent[]> {
    return db.select().from(trustPulseEvents).orderBy(desc(trustPulseEvents.createdAt)).limit(limit);
  }
  async createTrustPulseEvent(event: InsertTrustPulseEvent): Promise<TrustPulseEvent> {
    const [row] = await db.insert(trustPulseEvents).values(event).returning();
    return row;
  }
}

export const storage = new DatabaseStorage();
