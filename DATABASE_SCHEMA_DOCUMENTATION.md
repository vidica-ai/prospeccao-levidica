# Database Schema Documentation
## Prospeccao Levidica - Normalized Schema

**Generated on:** August 15, 2025  
**Database:** Supabase PostgreSQL  
**Migration Status:** Completed - Normalized structure implemented

---

## Overview

The database has been successfully migrated from a monolithic `leads` table to a fully normalized structure with four main tables and comprehensive views. This normalized structure eliminates data redundancy, improves data integrity, and provides better scalability.

### Current Status
- **Tables:** 4 normalized tables with proper foreign key relationships
- **Views:** 5 analytical views for simplified data access
- **Functions:** 5 utility functions for safe data operations
- **Records:** 9 organizers, 9 events, 6 contacts, 9 leads

---

## Table Structures

### 1. **organizer** - Event Organizers/Producers
Stores information about event organizers and producers.

**Columns:**
```sql
organizer_id    UUID        PRIMARY KEY (auto-generated)
name           TEXT        NOT NULL (organizer/producer name)
website        TEXT        NULLABLE (organizer website URL)
user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW() (auto-updated via trigger)
```

**Constraints:**
- `unique_organizer_per_user`: Unique constraint on (name, user_id) prevents duplicate organizers per user
- Foreign key to `auth.users(id)` with CASCADE DELETE

**Indexes:**
- `idx_organizer_user_id`: Fast filtering by user
- `idx_organizer_created_at`: Chronological ordering
- `idx_organizer_name`: Search functionality
- `idx_organizer_user_name`: Composite index for user's organizers by name
- `idx_organizer_website`: Domain-based lookups (WHERE website IS NOT NULL)

**Sample Data:**
```json
{
  "organizer_id": "7cbaabc5-e55e-4cd6-b24b-86fb56405027",
  "name": "ANCCA",
  "website": "https://ancca.com.br",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "created_at": "2025-08-14T03:00:06.068414+00:00",
  "updated_at": "2025-08-15T01:28:03.919258+00:00"
}
```

---

### 2. **event** - Events and Sympla Data
Stores individual event information linked to organizers.

**Columns:**
```sql
event_id       UUID        PRIMARY KEY (auto-generated)
nome_evento    TEXT        NOT NULL (event name from Sympla)
data_evento    TEXT        NOT NULL (event date string)
local          TEXT        NOT NULL (event location/venue)
sympla_url     TEXT        NOT NULL UNIQUE (original Sympla URL)
organizer_id   UUID        NOT NULL REFERENCES organizer(organizer_id) ON DELETE CASCADE
user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW() (auto-updated via trigger)
```

**Constraints:**
- `UNIQUE(sympla_url)`: Prevents duplicate events from same Sympla URL
- Foreign key to `organizer(organizer_id)` with CASCADE DELETE
- Foreign key to `auth.users(id)` with CASCADE DELETE
- Validation trigger ensures organizer belongs to same user

**Indexes:**
- `idx_event_user_id`: Fast filtering by user
- `idx_event_organizer_id`: Fast joins with organizer table
- `idx_event_created_at`: Chronological ordering
- `idx_event_sympla_url`: Fast duplicate checking
- `idx_event_data_evento`: Date-based filtering
- `idx_event_user_created`: User's events by creation date
- `idx_event_organizer_created`: Organizer's events
- `idx_event_nome_evento`: Full-text search on event names (Portuguese)

**Sample Data:**
```json
{
  "event_id": "4cbead32-f38a-4668-bc5d-2a75ff83f098",
  "nome_evento": "RH [RE]EVOLUÇÃO – Redes Humanas, Resistência Inteligente e o Futuro em Construção",
  "data_evento": "27 set - 2023",
  "local": "São Paulo, SP",
  "sympla_url": "https://www.sympla.com.br/evento/rh-re-evolucao-redes-humanas-resistencia-inteligente-e-o-futuro-em-construcao/3060923",
  "organizer_id": "34c39aed-2867-4015-aa30-23c563f81502",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "created_at": "2025-08-14T02:23:15.753158+00:00",
  "updated_at": "2025-08-14T02:23:15.753158+00:00"
}
```

---

### 3. **contact** - Organizer Contact Information
Stores contact information for organizers (multiple contacts per organizer).

**Columns:**
```sql
contact_id     UUID        PRIMARY KEY (auto-generated)
name          TEXT        NULLABLE (contact person name)
email         TEXT        NULLABLE (contact email address)
position      TEXT        NULLABLE (contact position/role)
organizer_id  UUID        NOT NULL REFERENCES organizer(organizer_id) ON DELETE CASCADE
user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
created_at    TIMESTAMPTZ DEFAULT NOW()
updated_at    TIMESTAMPTZ DEFAULT NOW() (auto-updated via trigger)
```

**Constraints:**
- `contact_has_info`: CHECK constraint ensures at least name OR email is provided
- `contact_email_format`: CHECK constraint validates email format using regex
- `unique_email_per_organizer`: Unique constraint on (organizer_id, email) when email is NOT NULL
- Foreign key to `organizer(organizer_id)` with CASCADE DELETE
- Foreign key to `auth.users(id)` with CASCADE DELETE
- Validation trigger ensures organizer belongs to same user

**Indexes:**
- `idx_contact_user_id`: Fast filtering by user
- `idx_contact_organizer_id`: Fast joins with organizer table
- `idx_contact_created_at`: Chronological ordering
- `idx_contact_email`: Fast email lookups (WHERE email IS NOT NULL)
- `idx_contact_name`: Full-text search on contact names (Portuguese)
- `idx_contact_organizer_created`: Organizer's contacts
- `idx_contact_user_created`: User's contacts by creation date
- `idx_contact_organizer_email_unique`: Partial unique index for non-null emails

**Sample Data:**
```json
{
  "contact_id": "0a051c12-af30-445c-93be-12620dbc7ed8",
  "name": null,
  "email": "atendimento@ancca.com.br",
  "position": null,
  "organizer_id": "7cbaabc5-e55e-4cd6-b24b-86fb56405027",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "created_at": "2025-08-14T03:00:06.068414+00:00",
  "updated_at": "2025-08-14T03:00:06.068414+00:00"
}
```

---

### 4. **leads** - Normalized Lead Records
Stores lead records with references to organizers and events.

**Columns:**
```sql
id                  UUID        PRIMARY KEY (auto-generated)
organizer_id        UUID        NOT NULL REFERENCES organizer(organizer_id) ON DELETE CASCADE
event_id            UUID        NOT NULL REFERENCES event(event_id) ON DELETE CASCADE
user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
contato_verificado  BOOLEAN     DEFAULT FALSE (whether contact has been verified)
data_ultima_busca   TIMESTAMPTZ NULLABLE (last search timestamp)
hunter_domain       TEXT        NULLABLE (domain used for Hunter.io search)
status_busca        TEXT        DEFAULT 'pendente' (search status enum)
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW() (auto-updated via trigger)
```

**Status Enum Values:**
- `'pendente'`: Search not yet started
- `'buscando'`: Search in progress
- `'encontrado'`: Contact information found
- `'nao_encontrado'`: No contact found
- `'erro'`: Error during search

**Constraints:**
- Foreign key to `organizer(organizer_id)` with CASCADE DELETE
- Foreign key to `event(event_id)` with CASCADE DELETE
- Foreign key to `auth.users(id)` with CASCADE DELETE
- Validation trigger ensures organizer and event belong to same user

**Indexes:**
- `idx_leads_organizer_id`: Fast joins with organizer table
- `idx_leads_event_id`: Fast joins with event table
- `idx_leads_organizer_event`: Composite index for organizer-event relationships
- `idx_leads_user_created`: User's leads by creation date
- `idx_leads_user_organizer`: User's leads by organizer
- `idx_leads_user_event`: User's leads by event
- `idx_leads_status_date`: Status-based queries with date ordering

**Sample Data:**
```json
{
  "id": "79e428b3-4140-4994-8e1f-a3d6b2c9b99c",
  "organizer_id": "34c39aed-2867-4015-aa30-23c563f81502",
  "event_id": "4cbead32-f38a-4668-bc5d-2a75ff83f098",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "contato_verificado": false,
  "data_ultima_busca": "2025-08-14T02:56:49.472+00:00",
  "hunter_domain": null,
  "status_busca": "encontrado",
  "created_at": "2025-08-14T02:23:15.753158+00:00",
  "updated_at": "2025-08-14T02:23:15.753158+00:00"
}
```

---

## Database Views

### 1. **leads_complete** - Complete Lead Information
Provides comprehensive lead data with all related information in a single query.

**Columns:**
```sql
-- Lead fields
id, organizer_id, event_id, user_id, contato_verificado, data_ultima_busca, 
hunter_domain, status_busca, created_at, updated_at

-- Organizer fields
organizer_name, organizer_website

-- Event fields  
nome_evento, data_evento, event_local, sympla_url

-- User fields
user_email, user_full_name
```

**Sample Data:**
```json
{
  "id": "79e428b3-4140-4994-8e1f-a3d6b2c9b99c",
  "organizer_id": "34c39aed-2867-4015-aa30-23c563f81502",
  "event_id": "4cbead32-f38a-4668-bc5d-2a75ff83f098",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "contato_verificado": false,
  "data_ultima_busca": "2025-08-14T02:56:49.472+00:00",
  "hunter_domain": null,
  "status_busca": "encontrado",
  "created_at": "2025-08-14T02:23:15.753158+00:00",
  "updated_at": "2025-08-14T02:23:15.753158+00:00",
  "organizer_name": "Grupo Trhoca",
  "organizer_website": "https://grupotrhoca.com.br",
  "nome_evento": "RH [RE]EVOLUÇÃO – Redes Humanas, Resistência Inteligente e o Futuro em Construção",
  "data_evento": "27 set - 2023",
  "event_local": "São Paulo, SP",
  "sympla_url": "https://www.sympla.com.br/evento/rh-re-evolucao-redes-humanas-resistencia-inteligente-e-o-futuro-em-construcao/3060923",
  "user_email": "levidica@local.dev",
  "user_full_name": "Levidica Test User"
}
```

### 2. **organizer_summary** - Organizer Statistics
Provides organizer information with aggregated statistics.

**Columns:**
```sql
-- Organizer fields
organizer_id, name, website, user_id, created_at, updated_at

-- Statistics
total_events, total_leads, total_contacts, verified_leads, 
successful_searches, last_search_date, last_event_date
```

**Sample Data:**
```json
{
  "organizer_id": "06d79930-0f08-4ce1-8cd4-4ea3677413d3",
  "name": "WEDCLASS",
  "website": "https://wedclass.com.br",
  "user_id": "3a146100-30bf-4324-88b6-8a4c1196098a",
  "created_at": "2025-08-14T02:28:54.864532+00:00",
  "updated_at": "2025-08-15T01:28:03.919258+00:00",
  "total_events": 1,
  "total_leads": 1,
  "total_contacts": 0,
  "verified_leads": 0,
  "successful_searches": 1,
  "last_search_date": "2025-08-14T03:02:17.721+00:00",
  "last_event_date": "2025-08-14T02:28:54.864532+00:00"
}
```

### 3. **event_summary** - Event Statistics
Provides event information with lead tracking statistics.

**Columns:**
```sql
-- Event fields
event_id, nome_evento, data_evento, local, sympla_url, organizer_id, 
user_id, created_at, updated_at

-- Organizer fields
organizer_name, organizer_website

-- Statistics
total_leads, verified_leads, successful_searches, last_search_date
```

### 4. **contact_summary** - Contact Information with Organizer
Provides contact information with related organizer details.

**Columns:**
```sql
-- Contact fields
contact_id, contact_name, email, position, organizer_id, user_id, 
created_at, updated_at

-- Organizer fields
organizer_name, organizer_website

-- Statistics
related_leads
```

### 5. **daily_stats** - Daily Creation Statistics
Provides daily statistics for all entity types by user.

**Columns:**
```sql
date         DATE     -- Creation date
entity_type  TEXT     -- 'organizer', 'event', 'contact', 'lead'
user_id      UUID     -- User who created the records
count        INTEGER  -- Number of records created on that date
```

---

## Database Functions

### 1. **get_or_create_organizer()**
Gets an existing organizer or creates a new one.

**Parameters:**
- `p_name` TEXT: Organizer name (required)
- `p_website` TEXT: Organizer website (optional)
- `p_user_id` UUID: User ID (defaults to auth.uid())

**Returns:** UUID (organizer_id)

**Example Usage:**
```sql
SELECT get_or_create_organizer('ANCCA', 'https://ancca.com.br');
```

### 2. **create_event_with_organizer()**
Creates an event and organizer (if needed) in a single operation.

**Parameters:**
- `p_nome_evento` TEXT: Event name
- `p_data_evento` TEXT: Event date
- `p_local` TEXT: Event location
- `p_sympla_url` TEXT: Sympla URL
- `p_organizer_name` TEXT: Organizer name
- `p_organizer_website` TEXT: Organizer website (optional)
- `p_user_id` UUID: User ID (defaults to auth.uid())

**Returns:** UUID (event_id)

### 3. **create_complete_lead()**
Creates a complete lead with organizer and event in a single operation.

**Parameters:**
- `p_nome_evento` TEXT: Event name
- `p_data_evento` TEXT: Event date
- `p_local` TEXT: Event location
- `p_sympla_url` TEXT: Sympla URL
- `p_organizer_name` TEXT: Organizer name
- `p_organizer_website` TEXT: Organizer website (optional)
- `p_user_id` UUID: User ID (defaults to auth.uid())

**Returns:** UUID (lead_id)

### 4. **add_organizer_contact()**
Adds a contact to an organizer with proper validation.

**Parameters:**
- `p_organizer_id` UUID: Organizer ID
- `p_name` TEXT: Contact name (optional)
- `p_email` TEXT: Contact email (optional)
- `p_position` TEXT: Contact position (optional)
- `p_user_id` UUID: User ID (defaults to auth.uid())

**Returns:** UUID (contact_id)

### 5. **update_lead_search_status_v2()**
Updates lead search status and creates contacts when email is found.

**Parameters:**
- `p_lead_id` UUID: Lead ID
- `p_new_status` TEXT: New status ('pendente', 'buscando', 'encontrado', 'nao_encontrado', 'erro')
- `p_found_email` TEXT: Email found during search (optional)
- `p_search_domain` TEXT: Domain used for search (optional)

**Returns:** BOOLEAN (success status)

---

## Row Level Security (RLS)

All tables have Row Level Security enabled with the following policies:

### **organizer** table:
- **SELECT**: Users can view only their own organizers
- **INSERT**: Users can insert organizers with their own user_id
- **UPDATE**: Users can update only their own organizers  
- **DELETE**: Users can delete only their own organizers

### **event** table:
- **SELECT**: Users can view only their own events
- **INSERT**: Users can insert events with their own user_id
- **UPDATE**: Users can update only their own events
- **DELETE**: Users can delete only their own events

### **contact** table:
- **SELECT**: Users can view only their own contacts
- **INSERT**: Users can insert contacts with their own user_id
- **UPDATE**: Users can update only their own contacts
- **DELETE**: Users can delete only their own contacts

### **leads** table:
- **SELECT**: Users can view only their own leads
- **INSERT**: Users can insert leads with their own user_id
- **UPDATE**: Users can update only their own leads
- **DELETE**: Users can delete only their own leads

### Views:
All views inherit RLS from their underlying tables and have `security_barrier = true` set.

---

## Database Relationships

```
auth.users (Supabase Auth)
    ↓ (1:many)
    ├── organizer
    ├── event  
    ├── contact
    └── leads

organizer
    ↓ (1:many)
    ├── event (organizer_id)
    ├── contact (organizer_id)  
    └── leads (organizer_id)

event
    ↓ (1:many)
    └── leads (event_id)
```

**Cascade Behavior:**
- Deleting a user deletes all their organizers, events, contacts, and leads
- Deleting an organizer deletes all their events, contacts, and leads
- Deleting an event deletes all its leads
- All foreign keys use `ON DELETE CASCADE`

---

## Legacy Compatibility

### **Legacy Lead Type (for backward compatibility):**
```typescript
export type LegacyLead = {
  id: string
  nome_evento: string
  data_evento: string
  local: string
  produtor: string
  sympla_url: string
  user_id: string
  created_at: string
  updated_at: string
  // Hunter.io integration columns
  email_contato: string | null
  website: string | null
  contato_verificado: boolean
  data_ultima_busca: string | null
  hunter_domain: string | null
  status_busca: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
}
```

### **Backup Views:**
- `leads_backup_view`: Preserves original structure through joins
- `leads_legacy_backup`: Backup of original monolithic structure
- `leads_migration_summary`: Migration status summary

---

## TypeScript Types (Frontend Integration)

### Core Types:
```typescript
export type Organizer = {
  organizer_id: string
  name: string
  website: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export type Event = {
  event_id: string
  nome_evento: string
  data_evento: string
  local: string
  sympla_url: string
  organizer_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type Contact = {
  contact_id: string
  name: string | null
  email: string | null
  position: string | null
  organizer_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export type Lead = {
  id: string
  organizer_id: string
  event_id: string
  user_id: string
  contato_verificado: boolean
  data_ultima_busca: string | null
  hunter_domain: string | null
  status_busca: 'pendente' | 'buscando' | 'encontrado' | 'nao_encontrado' | 'erro'
  created_at: string
  updated_at: string
}
```

### Insert/Update Types:
```typescript
export type OrganizerInsert = Omit<Organizer, 'organizer_id' | 'created_at' | 'updated_at'>
export type EventInsert = Omit<Event, 'event_id' | 'created_at' | 'updated_at'>
export type ContactInsert = Omit<Contact, 'contact_id' | 'created_at' | 'updated_at'>
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>
```

### Composite Types:
```typescript
export type LeadComplete = Lead & {
  organizer: Organizer
  event: Event
  contacts: Contact[]
}

export type CompleteLeadInput = {
  nome_evento: string
  data_evento: string
  local: string
  sympla_url: string
  organizer_name: string
  organizer_website?: string
  contact_name?: string
  contact_email?: string
  contact_position?: string
}
```

---

## Performance Optimization

### Indexes Created:
- **User-based indexes**: Fast filtering by user across all tables
- **Foreign key indexes**: Optimized joins between related tables
- **Timestamp indexes**: Chronological ordering and date-based queries
- **Full-text search**: Portuguese language support for event and contact names
- **Composite indexes**: Multi-column queries (user + organizer, user + created_at, etc.)
- **Partial indexes**: Email lookups only for non-null values

### Query Optimization:
- Views use security barriers for RLS enforcement
- Foreign key constraints ensure referential integrity
- Validation triggers prevent invalid data relationships
- Automatic `updated_at` timestamp maintenance

---

## Migration Summary

### **Before (Monolithic):**
- Single `leads` table with all data
- Data redundancy for organizer and event information
- No referential integrity between related data
- Difficult to manage organizer contacts

### **After (Normalized):**
- 4 normalized tables with proper relationships
- Eliminated data redundancy
- Referential integrity with foreign key constraints
- Support for multiple contacts per organizer
- Comprehensive views for easy data access
- Utility functions for complex operations
- Full RLS security implementation

### **Benefits Achieved:**
- **Data Integrity**: Foreign key constraints prevent orphaned records
- **Scalability**: Normalized structure supports growth
- **Performance**: Targeted indexes for common query patterns
- **Security**: Comprehensive RLS policies protect user data
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Support for multiple contacts per organizer
- **Analytics**: Rich summary views for reporting

---

## API Usage Examples

### Creating a Complete Lead:
```javascript
import { createCompleteLead } from './lib/normalized-db'

const result = await createCompleteLead({
  nome_evento: "Tech Conference 2025",
  data_evento: "15 mar - 2025", 
  local: "São Paulo, SP",
  sympla_url: "https://www.sympla.com.br/evento/...",
  organizer_name: "TechEvents Ltda",
  organizer_website: "https://techevents.com.br",
  contact_name: "João Silva",
  contact_email: "joao@techevents.com.br",
  contact_position: "Event Manager"
})
```

### Getting Complete Lead Information:
```javascript
import { getLeadsComplete } from './lib/normalized-db'

const { data: leads, error } = await getLeadsComplete()
// Returns leads with all organizer, event, and user information joined
```

### Getting Organizer Statistics:
```javascript
import { getOrganizersSummary } from './lib/normalized-db'

const { data: summary, error } = await getOrganizersSummary()
// Returns organizers with event counts, lead counts, etc.
```

---

## Maintenance and Backup

### Regular Maintenance:
- Monitor RLS policy performance
- Review index usage and optimization
- Validate foreign key constraint integrity
- Check trigger function performance

### Backup Considerations:
- Legacy backup views preserve original data structure
- Migration summary view tracks normalization completeness
- All views and functions are documented with comments
- Foreign key constraints ensure data consistency during backups

---

This documentation provides a complete reference for frontend developers to understand and work with the new normalized database structure. All tables, views, functions, and relationships are fully documented with examples and TypeScript types for seamless integration.