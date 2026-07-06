# 🚀 AVIRO — Affordable Verified Intelligent Ride Organizer
### Pune's College Ride Sharing Platform

---

## 📁 Project Structure

```
aviro-backend/
├── src/main/java/com/aviro/
│   ├── AviroApplication.java
│   ├── config/          # Security, WebSocket, Redis configs
│   ├── controller/      # REST + WebSocket controllers
│   ├── dto/             # Request & Response DTOs
│   │   ├── request/
│   │   └── response/
│   ├── entity/          # JPA Entities
│   ├── enums/           # Gender, Role, RideStatus, etc.
│   ├── exception/       # Custom exceptions & global handler
│   ├── repository/      # Spring Data JPA repositories
│   ├── security/        # JWT + UserDetails
│   └── service/         # Business logic (interface + impl)
└── src/main/resources/
    └── application.yml
```

---

## ⚙️ Prerequisites

| Tool | Version |
|------|---------|
| Java | 17+ |
| Maven | 3.8+ |
| PostgreSQL | 14+ |
| Redis | 7+ |

---

## 🛠️ Setup & Run

### 1. Clone & Configure

```bash
git clone <repo-url>
cd aviro-backend
```

Edit `src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/aviro_db
    username: your_pg_user
    password: your_pg_password
  mail:
    username: your_gmail@gmail.com
    password: your_gmail_app_password
```

### 2. Create PostgreSQL Database

```sql
CREATE DATABASE aviro_db;
CREATE USER aviro_user WITH PASSWORD 'aviro_pass';
GRANT ALL PRIVILEGES ON DATABASE aviro_db TO aviro_user;
```

### 3. Start Redis

```bash
# Mac
brew services start redis

# Ubuntu
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis
```

### 4. Run the Application

```bash
mvn clean install
mvn spring-boot:run
```

App starts at: `http://localhost:8080/api`

---

## 📡 API Endpoints

### 🔐 Auth  (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new student |
| POST | `/login` | Login & get JWT |
| POST | `/verify-otp` | Verify email OTP |
| POST | `/refresh-token` | Refresh JWT |
| POST | `/forgot-password` | Send reset OTP |
| POST | `/reset-password` | Reset password |
| POST | `/logout` | Logout |

### 👤 Users (`/api/users`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get my profile |
| PUT | `/profile` | Update profile |
| POST | `/vehicle` | Add vehicle |
| GET | `/vehicle` | Get my vehicle |
| POST | `/ride-buddies/{id}` | Add ride buddy |
| DELETE | `/ride-buddies/{id}` | Remove ride buddy |
| GET | `/dashboard` | Dashboard stats |

### 🏍️ Rides (`/api/rides`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create/offer a ride |
| POST | `/search` | Search rides with filters |
| GET | `/{id}` | Get ride details |
| GET | `/my` | My offered rides |
| GET | `/nearby?lat=&lng=&seats=` | Nearby rides |
| PATCH | `/{id}/status` | Update ride status |
| DELETE | `/{id}` | Cancel ride |
| GET | `/fare-estimate?from=&to=&seats=` | AI fare estimate |

### 📋 Bookings (`/api/bookings`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Book a ride |
| GET | `/my` | My bookings |
| GET | `/{id}` | Booking details |
| PATCH | `/{id}/status` | Accept/Reject booking (driver) |
| DELETE | `/{id}` | Cancel booking |
| GET | `/ride/{rideId}` | All bookings for a ride |

### 💬 Chat (`/api/chat`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/{rideId}/{otherUserId}` | Get conversation |
| GET | `/unread/{senderId}/{receiverId}` | Unread count |
| POST | `/mark-read/{senderId}/{receiverId}` | Mark as read |

### 🔔 Notifications (`/api/notifications`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | All notifications |
| GET | `/unread-count` | Unread count |
| POST | `/mark-all-read` | Mark all read |

### ⭐ Reviews (`/api/reviews`) — 🔒 Authenticated
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Submit review |
| GET | `/user/{userId}` | User's reviews |

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:8080/api/ws`

| Destination | Direction | Description |
|-------------|-----------|-------------|
| `/app/chat.send` | Client → Server | Send chat message |
| `/user/{id}/queue/messages` | Server → Client | Receive message |
| `/app/track.update` | Client → Server | Driver sends GPS location |
| `/topic/track/{rideId}` | Server → Client | Live location broadcast |
| `/app/sos.alert` | Client → Server | SOS trigger |
| `/topic/sos/{rideId}` | Server → Client | SOS broadcast |

---

## 🌟 Key Features

| # | Feature | Status |
|---|---------|--------|
| 1 | JWT Auth + OTP Email Verification | ✅ |
| 2 | Rider & Driver Roles | ✅ |
| 3 | **Gender Badge on Ride Cards** (Male/Female driver) | ✅ |
| 4 | Women-Only Ride Mode | ✅ |
| 5 | Smart Route Search with Filters | ✅ |
| 6 | Geo-based Nearby Rides (Haversine) | ✅ |
| 7 | Real-time Chat (WebSocket) | ✅ |
| 8 | Live GPS Tracking (WebSocket) | ✅ |
| 9 | SOS Emergency Alert | ✅ |
| 10 | Auto Fare Split | ✅ |
| 11 | AI Fare Estimation | ✅ |
| 12 | Recurring Rides Scheduler | ✅ |
| 13 | Ride Buddy System | ✅ |
| 14 | AVIRO Credits & Rewards | ✅ |
| 15 | College ID Verification | ✅ |
| 16 | Trust Score / Ratings | ✅ |
| 17 | Booking Accept/Reject Flow | ✅ |
| 18 | Push Notifications | ✅ |
| 19 | CO₂ Savings Tracker | ✅ |
| 20 | Dashboard Analytics | ✅ |

---

## 🔑 Sample Register Request

```json
POST /api/auth/register
{
  "fullName": "Rahul Patil",
  "email": "rahul@coep.ac.in",
  "password": "rahul@123",
  "phone": "9876543210",
  "gender": "MALE",
  "role": "BOTH",
  "collegeName": "COEP Pune",
  "department": "Computer Science",
  "yearOfStudy": "3rd Year",
  "locality": "Shivajinagar",
  "homeLat": 18.5314,
  "homeLng": 73.8446
}
```

---

## 🏗️ Tech Stack

- **Framework:** Spring Boot 3.2
- **Security:** Spring Security + JWT
- **Database:** PostgreSQL + Hibernate JPA
- **Cache:** Redis (OTP, sessions)
- **Real-time:** WebSocket + STOMP
- **Email:** JavaMailSender (Gmail SMTP)
- **Build:** Maven

---

Built with ❤️ for Pune's College Students — **Team AVIRO**
