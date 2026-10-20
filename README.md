<div align="center">

# 🏍️ AVIRO
### Affordable · Verified · Intelligent · Ride Organizer

**Pune's College Ride-Sharing Platform**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://mysql.com)
[![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

> *Connecting Pune college students on the same routes — Share rides, split costs, stay safe.*

**[🚀 Live Demo](https://aviro-affordable-verified-intellige.vercel.app)** · **[🐛 Report Bug](https://github.com/sahilshaikh450/AVIRO---Affordable-Verified-Intelligent-Ride-Organizer/issues)** · **[✨ Request Feature](https://github.com/sahilshaikh450/AVIRO---Affordable-Verified-Intelligent-Ride-Organizer/issues)**

</div>

---

## 📸 Screenshots

| Dashboard | Bookings | Live Tracking | Admin Panel |
|-----------|----------|---------------|-------------|
| Dark modern UI | Booking management | Zomato-style GPS | ID Verification |

---

## 🌟 Features

### 🔐 Authentication & Security
- **Email + Password Login** — Password checked with BCrypt, JWT issued on success
- **Password Reset via Email OTP** — 6-digit OTP stored in Redis, expires in 10 minutes
- **College Email Verification** — `.edu.in` domain validated via OTP (`.edu.in` emails are auto-verified at signup)
- **AI-powered College ID Scan** — Google Gemini Vision API checks uploaded ID cards; admin can approve/reject
- **JWT Authentication** — Access token (24h) + Refresh token (7 days)
- **Auto-logout** — 401 interceptor clears session on token expiry
- **Real Logout** — Logout revokes the access + refresh token on the server (Redis blacklist)
- **Rate Limiting** — Login, signup, OTP and password-reset endpoints are limited per IP (HTTP 429)
- **Role & Ownership Checks** — Admin APIs need the ADMIN role; bookings, chats, reviews and live location are limited to the people on that ride
- **Delete Account** — In-app, password-confirmed; personal data and college ID image are removed
- **Case-insensitive Email** — Emails are trimmed and lower-cased on signup/login

> ℹ️ Login OTP and signup email OTP are **temporarily disabled** (users get a JWT directly). The endpoints are kept so they can be switched back on.

### 🏍️ Ride Management
- **Post a Ride** — Drivers offer rides with route, time, seats, and fixed price
- **Smart Search** — Filter by route, time, gender preference, price range
- **Fare Estimate** — Suggested fare for a route
- **Women-Only Mode** — Female students can filter female-only drivers
- **Recurring Rides** — Schedule daily rides (MON-FRI)
- **Seat Management** — Auto-update available seats on booking/cancellation

### 📋 Booking System
- **Request → Confirm → Complete** — Full booking lifecycle
- **Booking ID** — Shown as `#AVR00001` for easy reference
- **Ride Start OTP** — Rider shares OTP, driver verifies before the ride starts
- **Driver Accept/Reject** — Real-time notifications on both sides
- **Cancellation** — Auto seat restoration on cancellation

### 💰 Payment System
- **UPI Deep Link** — Opens GPay, PhonePe, Paytm automatically
- **Cash Payment** — Rider claims → Driver confirms → Both notified
- **Payment Notifications** — Both parties get email + in-app alert on payment
- **Payment Tracking** — PENDING / COMPLETED / FAILED / REFUNDED

### 🗺️ Real-Time Features
- **Zomato-Style GPS Tracking** — Live driver location on mini map in booking card
- **Full Tracking Page** — Complete map with ride progress bar (5 steps)
- **WebSocket Chat** — STOMP/SockJS real-time messaging (JWT-authenticated)
- **Quick Messages** — Pre-set: "I'm here!", "On my way!", "5 min late"
- **Real-time Notifications** — Live bell with mark-all-read and delete

### 🛡️ Safety Features
- **SOS Emergency Button** — Double-confirm, sends live location to emergency contacts
- **Emergency Contacts** — Save 3 contacts, auto-email on SOS
- **Location Lost Alert** — 30-second GPS signal dropout detection
- **Ride Share Link** — Share live tracking link to family via email
- **Driver Reporting** — Report with reason, admin email alert
- **Location Cannot Be Stopped** — Driver location runs until ride complete

### ⭐ Reviews & Analytics
- **Star Rating** — 1-5 star review after every ride
- **Auto Rating Update** — Driver average recalculated on each review
- **Savings Analytics** — Solo travel vs AVIRO cost comparison
- **CO₂ Savings** — Environmental impact with tree-equivalent metric
- **Spending Chart** — 6-month bar chart visualization
- **Favourite Routes** — Most-used routes tracking

### 🛡️ Admin Panel
- **College ID Verification** — View uploaded IDs (loaded securely with the admin's token), approve/reject
- **Vehicle Verification** — Approve/reject registered vehicles
- **Platform Stats** — Total users, verified count, pending count
- **Two Tabs** — 🎓 College IDs | 🏍️ Vehicles

### 🧭 Onboarding & Legal
- **Welcome Onboarding** — 4-step intro after signup (verify ID, find a ride, offer a ride, stay safe)
- **Privacy Policy & Terms Pages** — Public `/privacy` and `/terms`, linked from login, signup and footer

### 📈 Monitoring
- **Error Tracking** — Sentry on frontend and backend (enabled when a DSN is set)
- **Analytics** — Vercel Web Analytics (enabled with an env flag)

### 📱 Mobile Experience
- **Bottom Navigation Bar** — 5 tabs for mobile
- **iOS Safe Area** — Notch/home bar support
- **Touch-Friendly** — 44px minimum tap targets
- **Input Zoom Prevention** — 16px font on inputs
- **PWA Ready** — Web app manifest included, installable on mobile

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React.js 18 | UI Development |
| **State Management** | Redux Toolkit | Global State |
| **Styling** | Tailwind CSS | Responsive UI |
| **Charts** | Recharts | Analytics charts |
| **Backend** | Spring Boot 3.2 | REST APIs |
| **Language** | Java 17 | Backend |
| **Security** | Spring Security 6 + JWT | Auth & Authorization |
| **Database** | MySQL 8.0 (Aiven) | Persistent Storage |
| **Cache** | Redis (Upstash) | OTP Storage |
| **Real-time** | WebSocket + STOMP + SockJS | Chat, Tracking & Notifications |
| **AI Verification** | Google Gemini Vision API | College ID Scan |
| **Email** | Gmail SMTP | OTP & alert emails |
| **Maps** | Leaflet.js | GPS Tracking |
| **Containerization** | Docker | Backend Deploy |
| **Backend Deploy** | Render | Cloud Hosting |
| **Frontend Deploy** | Vercel | Frontend CDN |
| **Error Tracking** | Sentry | Frontend + backend errors |
| **Analytics** | Vercel Web Analytics | Page views |

---

## 📁 Project Structure

```
AVIRO/
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/
│       ├── resources/application.yml   # All config, read from env variables
│       └── java/com/aviro/
│           ├── AviroApplication.java
│           ├── config/                 # Security, CORS, WebSocket, Redis, Async
│           │   ├── ApplicationConfig.java
│           │   ├── AsyncConfig.java
│           │   ├── CorsConfig.java
│           │   ├── RedisConfig.java
│           │   ├── SecurityConfig.java
│           │   ├── WebSocketConfig.java
│           │   └── WebSocketAuthInterceptor.java  # JWT auth for STOMP CONNECT
│           ├── controller/             # REST + WebSocket controllers
│           │   ├── AuthController.java
│           │   ├── RideController.java
│           │   ├── BookingController.java
│           │   ├── UserController.java
│           │   ├── AdminController.java
│           │   ├── ChatController.java
│           │   ├── NotificationController.java
│           │   ├── ReviewController.java
│           │   ├── LocationController.java
│           │   ├── LiveTrackingController.java
│           │   └── SafetyController.java
│           ├── service/                # Business logic
│           │   ├── impl/
│           │   │   ├── AuthServiceImpl.java
│           │   │   ├── RideServiceImpl.java
│           │   │   ├── BookingServiceImpl.java
│           │   │   └── UserServiceImpl.java
│           │   ├── AccountDeletionService.java
│           │   ├── ChatService.java
│           │   ├── CollegeIdVerificationService.java
│           │   ├── EmailService.java
│           │   ├── NotificationService.java
│           │   ├── OtpService.java
│           │   └── ReviewService.java
│           ├── entity/                 # JPA entities
│           │   ├── BaseEntity.java
│           │   ├── User.java
│           │   ├── Ride.java
│           │   ├── Booking.java
│           │   ├── Vehicle.java
│           │   ├── ChatMessage.java
│           │   ├── Notification.java
│           │   └── Review.java
│           ├── dto/                    # Request/Response DTOs
│           ├── repository/             # Spring Data JPA repositories
│           ├── security/               # JWT filter + token provider
│           │   ├── CustomUserDetailsService.java
│           │   ├── JwtAuthFilter.java
│           │   ├── JwtTokenProvider.java
│           │   ├── RateLimitFilter.java          # Per-IP limits on auth endpoints
│           │   └── TokenBlacklistService.java    # Revoked tokens after logout
│           ├── exception/              # AviroException + GlobalExceptionHandler
│           └── enums/                  # Role, Gender, RideStatus, BookingStatus, PaymentStatus, VehicleType
│
└── frontend/
    ├── public/
    │   ├── index.html
    │   └── manifest.json
    └── src/
        ├── pages/
        │   ├── LandingPage.js
        │   ├── IntroPage.js           # Onboarding shown at /welcome after signup
        │   ├── LegalPage.js           # /privacy and /terms
        │   ├── LoginPage.js           # Password login + forgot password (OTP)
        │   ├── RegisterPage.js        # 3-step signup with per-step validation
        │   ├── VerifyOtpPage.js       # Email OTP (kept for when signup OTP is re-enabled)
        │   ├── DashboardPage.js
        │   ├── SearchRidePage.js
        │   ├── OfferRidePage.js
        │   ├── RideDetailPage.js
        │   ├── MyRidesPage.js
        │   ├── BookingsPage.js        # With Zomato-style mini map
        │   ├── ChatPage.js            # Real-time + delete chat
        │   ├── ProfilePage.js         # Hide/show info toggle
        │   ├── LiveTrackingPage.js    # Full GPS tracking + SOS
        │   ├── AnalyticsPage.js       # Savings, CO₂, spending chart
        │   ├── AdminPage.js           # ID + Vehicle verification
        │   ├── SafetyPage.js          # Emergency contacts + report
        │   ├── SettingsPage.js        # Settings + Help chatbot
        │   └── NotFoundPage.js
        ├── components/common/
        │   ├── AppLayout.js           # Mobile + desktop layout
        │   ├── Sidebar.js
        │   ├── NotificationBell.js
        │   ├── LiveMap.js
        │   ├── LocationInput.js
        │   ├── MiniTrackingCard.js    # Zomato-style booking card map
        │   ├── PaymentChoiceModal.js  # UPI + Cash payment
        │   ├── UpiPayButton.js
        │   ├── RideOTPCard.js
        │   ├── ReviewModal.js
        │   ├── ReviewsSection.js
        │   ├── CollegeIdUpload.js
        │   ├── CollegeEmailVerify.js
        │   └── UIComponents.js
        ├── store/                     # Redux slices
        │   ├── store.js
        │   ├── authSlice.js
        │   ├── rideSlice.js
        │   ├── bookingSlice.js
        │   ├── chatSlice.js
        │   └── uiSlice.js
        ├── content/legal.js           # Privacy Policy + Terms text
        ├── services/
        │   ├── api.js                 # Axios: JWT header, 401 auto-logout, 60s timeout
        │   ├── monitoring.js          # Sentry setup
        │   └── websocket.js           # Shared WS_URL + STOMP helpers
        ├── hooks/useGeolocation.js
        └── utils/puneLocations.js
```

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.0
- Redis 7.0
- Maven 3.9+

### 🔧 Backend Setup

All backend settings come from **environment variables** (see [Configuration](#️-configuration)). You don't need to edit `application.yml`.

```bash
# 1. Clone the repo
git clone https://github.com/sahilshaikh450/AVIRO---Affordable-Verified-Intelligent-Ride-Organizer.git
cd AVIRO---Affordable-Verified-Intelligent-Ride-Organizer/backend

# 2. Create the MySQL database
mysql -u root -p -e "CREATE DATABASE aviro_db;"

# 3. Start Redis
redis-server

# 4. Set environment variables (example for local dev)
export DATABASE_URL="jdbc:mysql://localhost:3306/aviro_db?serverTimezone=Asia/Kolkata"
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=YOUR_MYSQL_PASSWORD
export REDIS_HOST=localhost
export REDIS_PASSWORD=
export SPRING_DATA_REDIS_SSL_ENABLED=false   # local Redis has no TLS
export MAIL_USERNAME=your_gmail@gmail.com
export MAIL_PASSWORD=YOUR_16_DIGIT_APP_PASSWORD
export AVIRO_JWT_SECRET=$(openssl rand -base64 48)
export GEMINI_API_KEY=YOUR_GEMINI_API_KEY    # optional, for AI ID scan
export PORT=8080                             # default is 10000

# 5. Run the backend
mvn spring-boot:run
# Backend: http://localhost:8080/api
```

Tables are created automatically on first run (`ddl-auto: update`).

### ⚛️ Frontend Setup

```bash
cd frontend
npm install

# Point the frontend at your backend (defaults to http://localhost:8080/api)
echo "REACT_APP_API_URL=http://localhost:8080/api" > .env.local

npm start
# Frontend: http://localhost:3000
```

---

## ⚙️ Configuration

### Backend Environment Variables (local & Render)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | JDBC URL, e.g. `jdbc:mysql://HOST:PORT/DB?useSSL=true` |
| `DATABASE_USERNAME` | ✅ | — | DB username |
| `DATABASE_PASSWORD` | ✅ | — | DB password |
| `REDIS_HOST` | ✅ | — | Redis host |
| `REDIS_PORT` | | `6379` | Redis port |
| `REDIS_USERNAME` | | `default` | Redis username |
| `REDIS_PASSWORD` | ✅ | — | Redis password (empty for local) |
| `SPRING_DATA_REDIS_SSL_ENABLED` | | `true` | Set `false` for local Redis without TLS |
| `MAIL_USERNAME` | ✅ | — | Gmail address used to send emails |
| `MAIL_PASSWORD` | ✅ | — | Gmail App Password |
| `AVIRO_JWT_SECRET` | ✅ | — | JWT signing secret (at least 32 bytes) |
| `AVIRO_JWT_EXPIRATION` | | `86400000` | Access token lifetime (ms, 24h) |
| `AVIRO_JWT_REFRESH_EXPIRATION` | | `604800000` | Refresh token lifetime (ms, 7 days) |
| `GEMINI_API_KEY` | | empty | Gemini key for AI college ID scan |
| `GEMINI_MODEL` | | `gemini-3.5-flash-lite` | Gemini model name |
| `SENTRY_DSN` | | empty | Sentry DSN for backend error tracking (empty = off) |
| `SENTRY_ENVIRONMENT` | | `production` | Environment name shown in Sentry |
| `PORT` | | `10000` | Server port |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | | `update` | Hibernate schema mode |

### Frontend Environment Variables (local & Vercel)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8080/api` | Backend API base URL (must end with `/api`) |
| `REACT_APP_WS_URL` | `REACT_APP_API_URL` + `/ws` | WebSocket (SockJS) URL, only if different |
| `REACT_APP_SENTRY_DSN` | empty | Sentry DSN for frontend error tracking (empty = off) |
| `REACT_APP_ENABLE_ANALYTICS` | `false` | Set `true` after enabling Web Analytics in Vercel |

### Getting API Keys

| Service | How to Get |
|---------|-----------|
| **Gmail App Password** | myaccount.google.com → Security → App Passwords |
| **Gemini API Key** | aistudio.google.com/apikey (Free) |
| **Sentry DSN** | sentry.io → Create project (React / Spring Boot) → Client Keys (DSN) |

---

## 📡 API Reference

All endpoints are under `/api`. Everything except `/api/auth/**` needs `Authorization: Bearer <accessToken>`. `/api/admin/**` needs an ADMIN account.

Auth endpoints are rate limited per IP (e.g. login 10/min, register 5/10 min, OTP sends 3/10 min) and return `429 Too Many Requests` when exceeded.

### Auth Endpoints

```
POST   /api/auth/register                  Register new student → returns JWT
POST   /api/auth/login                     Email + password → returns JWT
POST   /api/auth/refresh-token             New access token from refresh token
POST   /api/auth/logout                    Logout (revokes access + refresh token)
POST   /api/auth/forgot-password           Send password reset OTP
POST   /api/auth/reset-password            Reset password with OTP
POST   /api/auth/send-college-email-otp    Send college email OTP (logged in)
POST   /api/auth/verify-college-email-otp  Verify college email OTP (logged in)

# Kept for when OTP login/signup is re-enabled
POST   /api/auth/login-verify-otp          Verify login OTP → JWT
POST   /api/auth/verify-otp                Verify signup email OTP
POST   /api/auth/resend-otp                Resend signup email OTP
```

### Ride Endpoints

```
POST   /api/rides                     Create/offer a ride
POST   /api/rides/search              Search available rides (filters in body)
GET    /api/rides/my                  Driver's own rides
GET    /api/rides/{rideId}            Get ride details
GET    /api/rides/nearby              Nearby rides by GPS
GET    /api/rides/fare-estimate       Estimate fare for a route
PATCH  /api/rides/{rideId}/status     Update ride status
DELETE /api/rides/{rideId}            Cancel a ride
```

### Booking Endpoints

```
POST   /api/bookings                              Create booking
GET    /api/bookings/my                           Rider's bookings
GET    /api/bookings/{bookingId}                  Get booking by ID
GET    /api/bookings/ride/{rideId}                All bookings for a ride
PATCH  /api/bookings/{bookingId}/status           Accept/Reject/Complete
PATCH  /api/bookings/{bookingId}/payment          Record payment (UPI/Cash)
POST   /api/bookings/{bookingId}/confirm-cash     Driver confirms cash received
GET    /api/bookings/{bookingId}/ride-otp         Get ride start OTP (rider)
POST   /api/bookings/{bookingId}/verify-ride-otp  Verify ride start OTP (driver)
DELETE /api/bookings/{bookingId}                  Cancel booking
```

### User Endpoints

```
GET    /api/users/profile                      Get profile
PUT    /api/users/profile                      Update profile
GET    /api/users/dashboard                    Dashboard stats
POST   /api/users/vehicle                      Add vehicle
GET    /api/users/vehicle                      Get my vehicle
POST   /api/users/ride-buddies/{buddyId}       Add ride buddy
DELETE /api/users/ride-buddies/{buddyId}       Remove ride buddy
POST   /api/users/upload-college-id            Upload + AI verify college ID
GET    /api/users/college-id-image/{filename}  College ID image (needs token)
DELETE /api/users/me                           Delete my account ({ "password": "..." })
```

### Notification, Chat & Review Endpoints

```
GET    /api/notifications/my                   My notifications
GET    /api/notifications/unread-count         Unread count
PATCH  /api/notifications/mark-all-read        Mark all as read
DELETE /api/notifications/{id}                 Delete a notification

POST   /api/chat/send                          Send message (REST fallback)
GET    /api/chat/{rideId}/{otherUserId}        Conversation (?myId=)
GET    /api/chat/unread/{senderId}/{receiverId}     Unread count
POST   /api/chat/mark-read/{senderId}/{receiverId}  Mark as read

POST   /api/reviews                            Add review
GET    /api/reviews/user/{userId}              Reviews for a user
```

### Safety & Location Endpoints

```
POST   /api/safety/emergency-contacts          Save emergency contacts
POST   /api/safety/sos                         Trigger SOS alert
POST   /api/safety/share-ride/{bookingId}      Share tracking link
POST   /api/safety/report/{bookingId}          Report driver
POST   /api/location/arrived/{bookingId}       Driver arrived at pickup
```

### Admin Endpoints

```
GET    /api/admin/pending-verifications         Pending college IDs
POST   /api/admin/verify-college-id/{userId}    Approve ID
POST   /api/admin/reject-college-id/{userId}    Reject ID
GET    /api/admin/pending-vehicles              Pending vehicles
POST   /api/admin/verify-vehicle/{vehicleId}    Approve vehicle
POST   /api/admin/reject-vehicle/{vehicleId}    Reject vehicle
GET    /api/admin/stats                         Platform stats
```

### WebSocket (STOMP over SockJS)

Endpoint: `/api/ws`. Send the JWT in the STOMP `CONNECT` headers as `Authorization: Bearer <accessToken>` — the server uses it to route `/user/queue/...` messages to you.

```
# Send
/app/chat.send              Send chat message
/app/location.update        Driver broadcasts GPS location (per booking)
/app/location.message       Send quick message
/app/track.update           Driver broadcasts GPS location (per ride)
/app/sos.alert              SOS alert for a ride

# Subscribe (personal — routed to the logged-in user)
/user/queue/messages        Receive chat messages
/user/queue/location        Receive driver location
/user/queue/notifications   Receive notifications
/user/queue/quick-message   Receive quick messages

# Subscribe (per ride)
/topic/track/{rideId}       Live driver location
/topic/sos/{rideId}         SOS alerts
```

---

## 🗄️ Database Schema

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | Student accounts with verification status |
| `rides` | Posted rides with route, price, seats |
| `bookings` | Ride bookings with payment tracking |
| `vehicles` | Registered vehicles |
| `reviews` | Star ratings and comments |
| `notifications` | Notification records |
| `chat_messages` | WebSocket chat history |
| `emergency_contacts` | Users' emergency contacts |
| `ride_buddies` | User ↔ user ride buddy links |

---

## 🔒 Security Flow

```
Register → JWT issued (.edu.in email → college auto-verified)
Login → Rate limit check → Email + Password check → JWT (access 24h + refresh 7d)
Logout → Access + refresh token revoked in Redis → rejected everywhere
College ID → Upload → Gemini AI scan / Admin approve
Book Ride → College ID verified? ✅ → Proceed
Offer Ride → College ID verified? ✅ → Vehicle verified? ✅ → Post
Forgot Password → Email OTP → Reset
Admin API → ADMIN role? ✅ → Proceed (else 403)
Booking / Chat / Review → Rider or driver of that ride? ✅ → Proceed (else 403)
Token Expired → 401 → Auto logout → Redirect to login
```

---

## 🌐 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| **Frontend** | Vercel | https://aviro-affordable-verified-intellige.vercel.app |
| **Backend** | Render | https://aviro-affordable-verified-intelligent.onrender.com/api |
| **Database** | Aiven MySQL | Cloud hosted |
| **Cache** | Upstash Redis | TLS enabled |
| **AI** | Google Gemini | Free tier |

> ⚠️ **Render free tier notes**
> - The backend sleeps after ~15 min of inactivity; the first request can take ~50s (the frontend waits up to 60s).
> - The disk is not persistent: uploaded college ID images are lost on every redeploy. Use cloud storage (Cloudinary/S3) for production.

### Docker Deploy (Backend)

The container listens on port `10000` (or `$PORT`).

```bash
cd backend
docker build -t aviro-backend .
# .env holds the environment variables listed above
docker run -p 8080:10000 --env-file .env aviro-backend
# Backend: http://localhost:8080/api
```

---

## 👨‍💻 Developer

**Sahil Shaikh**
- 🎓 MCA Student @ MIT World Peace University, Pune
- 📧 sahilshaikh34088@gmail.com
- 💻 GitHub: [@sahilshaikh450](https://github.com/sahilshaikh450)
- 🌐 Live: [aviro-affordable-verified-intellige.vercel.app](https://aviro-affordable-verified-intellige.vercel.app)

---

<div align="center">

**Made with ❤️ for Pune College Students 🏍️**

*AVIRO — Ride Smart. Save More. Stay Safe.*

⭐ Star this repo if you found it useful!

</div>
