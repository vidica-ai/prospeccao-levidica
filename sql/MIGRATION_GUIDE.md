# Database Normalization Migration Guide

This guide provides instructions for migrating your lead prospecting application from a monolithic leads table to a normalized database structure.

## Overview

The migration transforms your database from a single `leads` table containing mixed data to a properly normalized structure with separate tables for:

- **organizer**: Event organizers/producers
- **event**: Individual events linked to organizers  
- **contact**: Contact information for organizers
- **leads**: Lead tracking information with references to organizers and events

## Migration Scripts

Execute the following scripts **in order**:

### 1. Prerequisites
Ensure you have:
- A backup of your current database
- Superuser access to your Supabase database
- All existing scripts (01-04) already applied

### 2. Migration Scripts Execution Order

```sql
-- Step 1: Create normalized tables
\i sql/05_create_organizer_table.sql
\i sql/06_create_event_table.sql  
\i sql/07_create_contact_table.sql

-- Step 2: Migrate existing data
\i sql/08_data_migration.sql

-- Step 3: Update leads table structure
\i sql/09_update_leads_table.sql

-- Step 4: Add performance indexes
\i sql/10_performance_indexes.sql

-- Step 5: Create views and utility functions
\i sql/11_views_and_functions.sql
```

### 3. Rollback Option (if needed)
If you need to revert the migration:
```sql
\i sql/12_rollback_migration.sql
```

## New Database Schema

### Organizer Table
```sql
organizer (
    organizer_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    website TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Event Table  
```sql
event (
    event_id UUID PRIMARY KEY,
    nome_evento TEXT NOT NULL,
    data_evento TEXT NOT NULL,
    local TEXT NOT NULL,
    sympla_url TEXT NOT NULL UNIQUE,
    organizer_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Contact Table
```sql
contact (
    contact_id UUID PRIMARY KEY,
    name TEXT,
    email TEXT,
    position TEXT,
    organizer_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Updated Leads Table
```sql
leads (
    id UUID PRIMARY KEY,
    organizer_id UUID NOT NULL,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    contato_verificado BOOLEAN,
    data_ultima_busca TIMESTAMP,
    hunter_domain TEXT,
    status_busca TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

## Key Features

### Row Level Security (RLS)
All tables implement RLS policies ensuring users can only access their own data:
- SELECT: Users can view only their own records
- INSERT: Users can only create records for themselves
- UPDATE: Users can only modify their own records  
- DELETE: Users can only delete their own records

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate data formats
- Unique constraints prevent duplicates
- Triggers enforce cross-table consistency

### Performance Optimization
- Comprehensive indexing strategy for common query patterns
- Full-text search indexes for name and location fields
- Trigram indexes for fuzzy matching
- Composite indexes for complex queries

## New Views and Functions

### Views
- `leads_complete`: Complete lead information with all related data
- `organizer_summary`: Organizer statistics with counts
- `event_summary`: Event information with lead tracking
- `contact_summary`: Contact information with organizer details
- `daily_stats`: Daily creation statistics for reporting

### Utility Functions
- `get_or_create_organizer()`: Safely get or create organizer
- `create_event_with_organizer()`: Create event and organizer together
- `create_complete_lead()`: Create complete lead structure in one call
- `add_organizer_contact()`: Add contact to organizer with validation
- `update_lead_search_status_v2()`: Updated search status function

## Migration Validation

After running the migration, verify success by:

1. **Check migration status**:
```sql
SELECT * FROM migration_status;
```

2. **Verify data counts**:
```sql
SELECT 'organizer' as table_name, COUNT(*) as count FROM organizer
UNION ALL
SELECT 'event', COUNT(*) FROM event  
UNION ALL
SELECT 'contact', COUNT(*) FROM contact
UNION ALL
SELECT 'leads', COUNT(*) FROM leads;
```

3. **Test views**:
```sql
SELECT * FROM leads_complete LIMIT 5;
SELECT * FROM organizer_summary LIMIT 5;
```

4. **Test functions**:
```sql
SELECT get_or_create_organizer('Test Organizer', 'https://example.com');
```

## Application Code Updates

Update your application code to use the new schema:

### Before (accessing monolithic leads)
```typescript
const { data: leads } = await supabase
  .from('leads')
  .select('*, nome_evento, produtor, sympla_url')
```

### After (accessing normalized data)  
```typescript
const { data: leads } = await supabase
  .from('leads_complete')
  .select('*')
```

### Creating new leads
```typescript
// Use the utility function
const { data } = await supabase
  .rpc('create_complete_lead', {
    p_nome_evento: 'Event Name',
    p_data_evento: '2024-12-01', 
    p_local: 'Event Location',
    p_sympla_url: 'https://sympla.com/event',
    p_organizer_name: 'Organizer Name',
    p_organizer_website: 'https://organizer.com'
  })
```

## Benefits of the New Structure

1. **Data Normalization**: Eliminates redundancy and improves data integrity
2. **Better Performance**: Optimized indexes for common query patterns
3. **Scalability**: Easier to add new features and relationships
4. **Maintainability**: Clear separation of concerns
5. **Consistency**: Enforced relationships and constraints
6. **Flexibility**: Support for multiple contacts per organizer
7. **Analytics**: Better reporting and analytics capabilities

## Troubleshooting

### Common Issues

1. **Migration fails on data migration step**:
   - Check for invalid data in existing leads table
   - Ensure all required fields have valid values
   - Review the migration log for specific errors

2. **Some leads not linked after migration**:
   - Check the `migration_status` view
   - Manually review unlinked leads
   - Fix data issues and re-run data migration

3. **Performance issues after migration**:
   - Run `ANALYZE` on all tables
   - Check `index_usage_stats` view
   - Consider additional indexes for your specific query patterns

### Recovery Options

If issues arise during migration:

1. **Partial rollback**: Restore from backup and fix issues
2. **Full rollback**: Use the rollback script to return to original structure
3. **Manual fixes**: Address specific data issues and continue

## Support

For additional assistance:
- Review the comments in each migration script
- Check the validation queries in the scripts
- Use the monitoring views for ongoing performance tracking

Remember to test the migration thoroughly in a development environment before applying to production!