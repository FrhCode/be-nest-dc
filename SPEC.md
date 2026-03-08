# Server & Channel Feature Spec

## Context

The app currently has auth and user management. We need to add Discord-like server/channel functionality where users can create servers, servers have channels (video/mic/message types), and users have roles per server.

---

## Database Schema

### `servers` table
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| name | varchar(100) | not null |
| icon_url | varchar(500) | nullable |
| invite_code | varchar(20) | unique, auto-generated |
| owner_id | integer | FK → users.id, not null |
| created_at | timestamp | default now() |
| created_by | varchar(255) | not null |
| modified_at | timestamp | default now() |
| modified_by | varchar(255) | not null |

### `channels` table
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| name | varchar(100) | not null |
| type | enum('video', 'mic', 'message') | not null |
| server_id | integer | FK → servers.id, not null, onDelete cascade |
| created_at | timestamp | default now() |
| created_by | varchar(255) | not null |
| modified_at | timestamp | default now() |
| modified_by | varchar(255) | not null |

### `server_members` table
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| user_id | integer | FK → users.id, not null |
| server_id | integer | FK → servers.id, not null, onDelete cascade |
| role | enum('admin', 'member') | default 'member' |
| created_at | timestamp | default now() |
| unique constraint | | (user_id, server_id) |

### `messages` table
| Column | Type | Notes |
|--------|------|-------|
| id | serial | PK |
| content | varchar(2000) | not null |
| channel_id | integer | FK → channels.id, not null, onDelete cascade |
| sender_id | integer | FK → users.id, not null |
| created_at | timestamp | default now() |
| modified_at | timestamp | default now() |

### Drizzle enums
- `channelTypeEnum` = pgEnum('channel_type', ['video', 'mic', 'message'])
- `serverRoleEnum` = pgEnum('server_role', ['admin', 'member'])

---

## File Structure

```
src/
├── db/
│   ├── servers.ts          # servers table schema
│   ├── channels.ts         # channels table + channelTypeEnum
│   ├── server-members.ts   # server_members table + serverRoleEnum
│   ├── messages.ts         # messages table schema
│   └── index.ts            # re-export all schemas
├── server/
│   ├── server.module.ts
│   ├── server.service.ts
│   ├── server.controller.ts
│   └── dto/
│       ├── create-server.dto.ts
│       └── update-server.dto.ts
├── channel/
│   ├── channel.module.ts
│   ├── channel.service.ts
│   ├── channel.controller.ts
│   └── dto/
│       ├── create-channel.dto.ts
│       └── update-channel.dto.ts
├── message/
│   ├── message.module.ts
│   ├── message.service.ts
│   ├── message.controller.ts
│   └── dto/
│       └── create-message.dto.ts
```

---

## API Endpoints

### Server (`/servers`)
All endpoints require `JwtAuthGuard`.

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/servers` | Create server (creator becomes admin, auto-creates "general" message channel) | any user |
| GET | `/servers` | List user's servers | any user |
| GET | `/servers/:id` | Get server details + channels | server member |
| PATCH | `/servers/:id` | Update server name/icon | admin |
| DELETE | `/servers/:id` | Delete server | owner only |
| POST | `/servers/join` | Join via invite code (body: `{ inviteCode }`) | any user |
| POST | `/servers/:id/leave` | Leave server | member (not owner) |
| POST | `/servers/:id/invite` | Direct invite user (body: `{ userId }`) | admin |
| PATCH | `/servers/:id/transfer` | Transfer ownership (body: `{ userId }`) | owner only |
| GET | `/servers/:id/members` | List members with roles | server member |
| PATCH | `/servers/:id/members/:userId` | Update member role | admin |
| DELETE | `/servers/:id/members/:userId` | Kick member | admin |

### Channel (`/servers/:serverId/channels`)
All endpoints require `JwtAuthGuard` + server membership.

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/servers/:serverId/channels` | Create channel | admin |
| GET | `/servers/:serverId/channels` | List channels | member |
| PATCH | `/servers/:serverId/channels/:id` | Update channel | admin |
| DELETE | `/servers/:serverId/channels/:id` | Delete channel | admin |

### Message (`/channels/:channelId/messages`)
Only for channels with type `message`. Requires membership in parent server.

| Method | Path | Description | Access |
|--------|------|-------------|--------|
| POST | `/channels/:channelId/messages` | Send message | member |
| GET | `/channels/:channelId/messages` | List messages (paginated, cursor-based) | member |
| PATCH | `/channels/:channelId/messages/:id` | Edit own message | sender |
| DELETE | `/channels/:channelId/messages/:id` | Delete message | sender or admin |

---

## Authorization Guards

| Guard | Purpose |
|-------|---------|
| `JwtAuthGuard` | Existing — verifies JWT, attaches `req.user` |
| `ServerMemberGuard` | Checks user is a member of the server (reads `:id` or `:serverId` param) |
| `ServerAdminGuard` | Checks user has `admin` role in the server |

---

## Implementation Tasks

### Task 1: Database schemas
- Create `src/db/servers.ts`, `channels.ts`, `server-members.ts`, `messages.ts`
- Follow existing patterns (audit fields, FK references) from `src/db/users.ts`
- Export all from `src/db/index.ts`
- Run `npm run db:generate` then `npm run db:migrate`

### Task 2: Server module
- Create `src/server/` module with CRUD + join/leave/member management
- Zod DTOs: `CreateServerDto` (name, iconUrl?), `UpdateServerDto` (name?, iconUrl?)
- Auto-generate invite code on create (crypto.randomBytes)
- Creator is auto-added as admin in `server_members`
- Join via invite code + direct invite endpoint (admin adds user by userId)
- Transfer ownership endpoint (owner transfers to an existing admin member)
- Wire into `app.module.ts`

### Task 3: Channel module
- Create `src/channel/` module
- Zod DTOs: `CreateChannelDto` (name, type), `UpdateChannelDto` (name?)
- Validate server membership via guard or service check
- When a server is created, auto-create a "general" message channel

### Task 4: Message module
- Create `src/message/` module
- Zod DTO: `CreateMessageDto` (content)
- Paginated listing (cursor-based)
- Only allow on `message` type channels

### Task 5: Authorization guards
- Create `ServerMemberGuard` — checks user is a member of the server
- Create `ServerAdminGuard` — checks user has admin role
- Reuse `JwtAuthGuard` from auth module

### Task 6: Register in app.module.ts
- Import `ServerModule`, `ChannelModule`, `MessageModule`

---

## Verification
1. `npm run build` — must compile without errors
2. `npm run db:generate` — generates migration files
3. `npm run db:migrate` — applies migrations
4. Test via Swagger at `/docs`:
   - Create server → verify invite code generated, creator is admin, "general" channel created
   - Create channels of each type (video, mic, message)
   - Join server with another user via invite code
   - Direct invite a user by userId
   - Transfer ownership to an admin member
   - Send/list messages in message channel
   - Role-based access (admin vs member) works correctly
