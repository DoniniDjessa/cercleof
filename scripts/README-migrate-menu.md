# Menu Data Migration Script

This script migrates the existing menu data from `docs/todo.md` into the `dd-menu` table in Supabase.

## Prerequisites

1. **Run the SQL migration first:**
   ```sql
   -- Execute this in your Supabase SQL editor
   -- File: database/create-menu-data-table.sql
   ```

2. **Set up environment variables in `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   **Note:** The script automatically loads variables from `.env.local`. If you prefer, you can also set them as system environment variables.
   
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL (required)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (recommended for migrations)
     - OR `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (may have permission issues)

## Usage

### Option 1: Using npm script (recommended)
```bash
npm run migrate-menu
```

### Option 2: Direct Node.js execution
```bash
node scripts/migrate-menu-data.js
```

### Option 3: Using TypeScript (if you have ts-node)
```bash
npx tsx scripts/migrate-menu-data.ts
```

## What the script does

1. ✅ Automatically loads environment variables from `.env.local`
2. ✅ Reads the JSON data from the "## Existing Data (JSON)" section in `docs/todo.md`
3. ✅ Extracts and parses the JSON code block
4. ✅ Validates the data structure (categories, subcategories, services)
5. ✅ Checks if the `dd-menu` table exists
6. ✅ Inserts or updates the menu data using a singleton pattern (fixed ID)
7. ✅ Provides a detailed summary of migrated data

## Expected Output

```
🚀 Starting menu data migration...

📖 Reading menu data from: /path/to/docs/todo.md
✅ Extracted 7 categories from todo.md
🔍 Validating menu data structure...
✅ Menu data validation passed

🔍 Checking if dd-menu table exists...
💾 Saving menu data to dd-menu table...
✅ Menu data saved successfully!

📊 Summary:
   - Categories: 7
   - SubCategories: 5
   - Services: 150+

✨ Migration completed successfully!
```

## Troubleshooting

### Error: "Table does not exist"
- Make sure you've run `database/create-menu-data-table.sql` in your Supabase SQL editor

### Error: "Permission denied"
- Use `SUPABASE_SERVICE_ROLE_KEY` instead of the anon key
- Check your RLS policies in Supabase

### Error: "Could not find JSON block"
- Ensure `docs/todo.md` exists and contains the JSON block between `\`\`\`json` markers

### Error: "Validation failed"
- Check the console output for specific validation errors
- Ensure all categories have required fields (title, subtitle, video)
- Ensure categories have either services OR subcategories, not both

## Notes

- The script uses a singleton pattern with a fixed UUID: `00000000-0000-0000-0000-000000000001`
- If data already exists, it will be updated (upsert)
- The script validates the data structure before saving
- All timestamps are automatically set by the database triggers

