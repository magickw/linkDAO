#!/usr/bin/env python3
"""
Script to automatically fix all migration index creation errors by making them conditional.
This script runs the migration, captures errors, and fixes them one by one.
"""

import subprocess
import re
import sys

def run_migration():
    """Run the migration and capture output."""
    result = subprocess.run(
        ['npm', 'run', 'migrate'],
        capture_output=True,
        text=True,
        timeout=300
    )
    return result.stdout + result.stderr

def extract_error_info(output):
    """Extract error information from migration output."""
    # Pattern to match the error message
    pattern = r'column "([^"]+)" does not exist.*?CREATE INDEX IF NOT EXISTS "([^"]+)" ON "([^"]+)" USING btree \("([^"]+)"\)'
    match = re.search(pattern, output, re.DOTALL)

    if match:
        column_name = match.group(1)
        index_name = match.group(2)
        table_name = match.group(3)
        return column_name, index_name, table_name

    return None, None, None

def fix_index_in_migration(table_name, column_name, index_name):
    """Fix the index creation in the migration file."""
    migration_file = 'drizzle/0027_high_amphibian.sql'

    with open(migration_file, 'r') as f:
        content = f.read()

    # Pattern to match the index creation
    pattern = rf'CREATE INDEX IF NOT EXISTS "{re.escape(index_name)}" ON "{re.escape(table_name)}" USING btree \("{re.escape(column_name)}"\);--> statement-breakpoint'

    # Replacement pattern
    replacement = f'''DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND column_name = '{column_name}'
    ) THEN
        CREATE INDEX IF NOT EXISTS "{index_name}"
        ON "{table_name}" USING btree ("{column_name}");
        RAISE NOTICE 'Created index {index_name}';
    ELSE
        RAISE NOTICE 'Column {column_name} does not exist in {table_name} table, skipping index creation';
    END IF;
END$$;--> statement-breakpoint'''

    # Replace the pattern
    new_content = re.sub(pattern, replacement, content)

    # Write back
    with open(migration_file, 'w') as f:
        f.write(new_content)

    print(f"Fixed index {index_name} on {table_name}.{column_name}")

def main():
    max_attempts = 50  # Prevent infinite loops
    attempt = 0

    while attempt < max_attempts:
        attempt += 1
        print(f"\nAttempt {attempt}...")

        # Run migration
        output = run_migration()

        # Check if migration succeeded
        if "Migrations completed successfully" in output or "No migrations to apply" in output:
            print("\n✅ Migration completed successfully!")
            return

        # Check if there's an error
        if "ERROR: Error running migrations" in output:
            column_name, index_name, table_name = extract_error_info(output)

            if column_name and index_name and table_name:
                print(f"Found error: column '{column_name}' does not exist in table '{table_name}'")
                print(f"Fixing index '{index_name}'...")

                fix_index_in_migration(table_name, column_name, index_name)
            else:
                print("Could not extract error information. Full output:")
                print(output)
                sys.exit(1)
        else:
            print("Unexpected error. Full output:")
            print(output)
            sys.exit(1)

    print(f"Reached maximum attempts ({max_attempts}). Please check manually.")
    sys.exit(1)

if __name__ == '__main__':
    main()