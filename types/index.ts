// Common types for the TYT CRM application

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'admin' | 'manager' | 'agent' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: Address;
  status: CustomerStatus;
  source: CustomerSource;
  tags: string[];
  notes?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'inactive';
export type CustomerSource = 'website' | 'referral' | 'social_media' | 'cold_call' | 'email' | 'other';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Deal {
  id: string;
  title: string;
  description?: string;
  customerId: string;
  assignedTo: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: Date;
  actualCloseDate?: Date;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type DealStage = 
  | 'lead' 
  | 'qualified' 
  | 'proposal' 
  | 'negotiation' 
  | 'closed_won' 
  | 'closed_lost';

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  customerId?: string;
  dealId?: string;
  assignedTo: string;
  scheduledAt?: Date;
  completedAt?: Date;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note';
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  customerId?: string;
  dealId?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface DashboardStats {
  totalCustomers: number;
  totalDeals: number;
  totalRevenue: number;
  activeDeals: number;
  conversionRate: number;
  averageDealValue: number;
  monthlyGrowth: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface FilterParams {
  status?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company?: string;
}

export interface CustomerForm {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: Address;
  status: CustomerStatus;
  source: CustomerSource;
  tags: string[];
  notes?: string;
  assignedTo?: string;
}

export interface DealForm {
  title: string;
  description?: string;
  customerId: string;
  assignedTo: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: Date;
  tags: string[];
  notes?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  read: boolean;
  createdAt: Date;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    defaultView: string;
    refreshInterval: number;
  };
}

// File upload types
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}
export type ChatMedia = {
  url: string;
  contentType?: string;
  fileName?: string;
};

// Chat types
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  timestamp: Date;
  replyTo?: string;
  attachments?: MessageAttachment[];
  isRead: boolean;
  readAt?: Date;
  media?: ChatMedia[];  
}

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'video' | 'location' | 'contact';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  customerPhone?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  status: ChatStatus;
  assignedTo?: string;
  assignedToName?: string;
  tags: string[];
  priority: ChatPriority;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  userId:any;
}

export type ChatType = 'whatsapp' | 'support';
export type ChatStatus = 'active' | 'resolved' | 'pending' | 'closed';
export type ChatPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChatParticipant {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastSeenAt?: Date;
  isOnline: boolean;
}

export type ParticipantRole = 'customer' | 'agent' | 'admin' | 'manager';

export interface ChatFilter {
  type?: ChatType;
  status?: ChatStatus;
  priority?: ChatPriority;
  assignedTo?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Campaign types
export interface Campaign {
  id: string;
  title: string;
  description?: string;
  content: string;
  images: CampaignImage[];
  status: CampaignStatus;
  type: CampaignType;
  createdBy: string;
  createdByName: string;
  scheduledAt?: Date;
  sentAt?: Date;
  targetAudience: CampaignAudience;
  selectedUsers?: string[];
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  responseCount: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
export type CampaignType = 'manual' | 'ai_generated';
export type CampaignAudience = 'all_users' | 'selected_users';

export interface CampaignForm {
  title: string;
  description?: string;
  content: string;
  images: File[];
  type: CampaignType;
  targetAudience: CampaignAudience;
  selectedUsers?: string[];
  scheduledAt?: Date;
  tags: string[];
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageResponseRate: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
}

// Socket event types for booking system
export interface SocketEvents {
  // Real-time events
  'new_user_activity': UserActivity;
  'user_activity_update': UserActivity;
  'activity_update': UserActivity;
  'latest_user_activity_update': UserActivity;
  'booking_activity_update': BookingActivity;
  'hotel_checkout_activity': HotelActivity;
  'hotel_page_view_activity': HotelActivity;
  'whatsapp_message_received': WhatsAppMessage;
  
  // Response events
  'latest_activities': UserActivity[];
  'latest_per_user_activities': UserActivity[];
  'booking_activities': BookingActivity[];
  'user_activities': UserActivity[];
  'whatsapp_messages': WhatsAppMessage[];
  'unprocessed_whatsapp_messages': WhatsAppMessage[];
  'filtered_activities': UserActivity[];
  
  // Error events
  'error': { message: string; code?: string };
}

// Updated booking types to match API format
export interface Booking {
  _id: string;
  bookingCode: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  paymentId?: string;
  merchantTransactionId?: string;
  guestIncharge: {
    fullName: string;
    phone: string;
    email: string;
    hometown: string;
    departingLocation: string;
    ageRange: string;
  };
  numberOfGuests: number;
  guestNames: string[];
  hotelStay: {
    hotelId: {
      _id: string;
      location: {
        address: string;
        city: string;
        state: string;
        country: string;
        pincode: string;
        latitude: number;
        longitude: number;
        geo: {
          type: string;
        };
        distance_from_railway_station: any[];
        popular_landmarks_nearby: string[];
      };
    };
    hotelName: string;
    rooms: number;
    checkInAt: string;
    checkOutAt: string;
    notes: string;
  };
  associated_id: any[];
  edit_Access: boolean;
  status: BookingStatus;
  cancel_booking: boolean;
  pricing: {
    packagePrice: {
      base: number;
    };
    taxes: number;
    totalPackageAmount: number;
    discount: {
      code: string;
      amount: number;
      appliedNow: boolean;
    };
    grandTotal: number;
  };
  payment: {
    currency: string;
    advancePaid: number;
    balanceDue: number;
    balanceDueNote: string;
    status: PaymentStatus;
    history: PaymentHistory[];
  };
  termsAccepted: {
    accepted: boolean;
  };
  booking_policies: {
    cancellation_policy: string;
    smoking_policy: string;
    early_checkin_policy: string;
    late_checkout_policy: string;
    pets_policy: string;
    children_policy: string;
  };
  services: any[];
  freebies?: any[];
  documents: Document[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'refunded';

export interface PaymentHistory {
  at: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
}

export interface Document {
  kind: string;
  label: string;
  fileUrl: string;
  fileId: string;
  verified: boolean;
  uploadedAt: string;
}

// Socket-specific types
export interface UserActivity {
  id: string;
  userId: string;
  userName?: string;
  eventType: UserActivityEventType;
  eventData?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

// Comprehensive user activity data structure
export interface DetailedUserActivity {
  _id: string;
  anonymousId: string | null;
  behavioralIntelligence: {
    conversionSignals: any[];
    engagementTags: any[];
    interactionHeatAnalysis: {
      highInteractionPages: any[];
    };
    revisitFrequency: number;
    scrollDepthAnalysis: {
      pagesWithHighScroll: any[];
    };
    sessionPathMapping: any[];
  };
  chatInteraction: {
    chatEnded: boolean;
    chatStarted: boolean;
    chatWithAgent: boolean;
    followUpPrompts: number;
    llmPromptGiven: number;
  };
  conversionBehavior: {
    addedRoomOrDateToCart: boolean;
    applyCoupon: boolean;
    bookNow: boolean;
    checkoutAbandon: boolean;
    enterGuestDetails: boolean;
    enteredCardInfo: boolean;
    exitFromPayment: boolean;
    lockPrice: boolean;
    paymentPageLoaded: boolean;
    proceedToCheckout: boolean;
    reserveNow: boolean;
    startCheckout: boolean;
  };
  createdAt: string;
  engagementBehavior: {
    checkAvailabilityClick: number;
    clickedShowAllPhotos: boolean;
    copyHotelName: boolean;
    dateChanged: number;
    lockPriceClick: number;
    openRecentlyViewed: boolean;
    openedCancellationPolicy: boolean;
    openedReviews: number;
    openedRoomAmenities: number;
    priceChecked: number;
    revisitHotelPage: number;
    shareHotelLink: boolean;
    viewedHotelsSameDestination: number;
    viewedMultipleRooms: number;
    wishlistAdd: number;
  };
  eventType: string;
  explorationBehavior: {
    clickReviews: number;
    filteredByStarRating: any[];
    hotelPageView: number;
    interactionHeat: number;
    lastViewedHotelId: string | null;
    mapOpened: boolean;
    openedFAQs: boolean;
    photosOpened: number;
    roomView: number;
    scrollDepth: number;
    viewAmenities: number;
    viewedHomepageOffers: boolean;
    viewedHotels: any[];
    viewedLocalTours: boolean;
    viewedPerks: boolean;
    viewedTransport: boolean;
  };
  ipAddress: string | null;
  lastActivity: string;
  metadata: {
    ipAddress: string;
    source: string;
    timestamp: string;
    userAgent: string;
  };
  monitoringHistory: Array<{
    timestamp: string;
    eventType: string;
    userId: string | null;
    sessionContext: any;
    explorationBehavior: any;
    [key: string]: any;
  }>;
  sessionContext: {
    deviceType: string;
    language: string;
    llmQueries: number;
    llmQueryHistory: any[];
    locationDetails: {
      timezone: string;
    };
    secondaryLanguage: string;
    timeSpentTotal: number;
    visitedTime: string;
  };
  sessionId: string;
  sessionStatus: string;
  source: string;
  timestamp: string;
  updatedAt: string;
  userAgent: string | null;
  userId: {
    email: string;
    name: string;
    _id: string;
  } | null;
  __v: number;
}

export type UserActivityEventType = 
  | 'login' 
  | 'logout' 
  | 'booking_created' 
  | 'hotel_view' 
  | 'hotel_checkout' 
  | 'hotel_page_view';

export interface BookingActivity {
  id: string;
  bookingId: string;
  userId: string;
  userName?: string;
  status: BookingStatus;
  eventType: BookingEventType;
  eventData?: any;
  timestamp: Date;
}

export type BookingEventType = 
  | 'created' 
  | 'updated' 
  | 'confirmed' 
  | 'cancelled' 
  | 'completed' 
  | 'no_show';

export interface HotelActivity {
  id: string;
  userId: string;
  userName?: string;
  hotelId?: string;
  hotelName?: string;
  activityType: HotelActivityType;
  eventData?: any;
  timestamp: Date;
}

export type HotelActivityType = 'view' | 'checkout' | 'page_view';

export interface WhatsAppMessage {
  id: string;
  phoneNumber: string;
  userId?: string;
  userName?: string;
  message: string;
  messageType: WhatsAppMessageType;
  status: WhatsAppMessageStatus;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
}

export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'video' | 'document';
export type WhatsAppMessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed';

// Socket connection states
export type SocketConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

// Socket context types
export interface SocketContextType {
  socket: any | null;
  connectionState: SocketConnectionState;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: <K extends keyof SocketEvents>(event: K, data: SocketEvents[K]) => void;
  on: <K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void) => void;
  off: <K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void) => void;
}

