#!/usr/bin/env python3
"""
Script to fix migration index creation issues by making them conditional on column existence.
This script reads the migration file and wraps index creations in DO blocks that check if the column exists.
"""

import re
import sys

def fix_index_creation(line):
    """
    Convert a CREATE INDEX statement to a conditional one that checks if the column exists.
    """
    # Pattern to match CREATE INDEX IF NOT EXISTS statements
    pattern = r'CREATE INDEX IF NOT EXISTS "([^"]+)" ON "([^"]+)" USING btree \(([^)]+)\);--> statement-breakpoint'

    match = re.match(pattern, line)
    if match:
        index_name = match.group(1)
        table_name = match.group(2)
        columns = match.group(3)

        # Extract the first column name (for single column indexes)
        # For multi-column indexes, we'll check all columns
        column_list = [col.strip().strip('"') for col in columns.split(',')]

        # Create a conditional block that checks if all columns exist
        conditions = []
        for col in column_list:
            conditions.append(f"column_name = '{col}'")

        where_clause = " AND ".join(conditions)

        conditional_block = f'''DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        AND ({where_clause})
    ) THEN
        CREATE INDEX IF NOT EXISTS "{index_name}"
        ON "{table_name}" USING btree ({columns});
        RAISE NOTICE 'Created index {index_name}';
    ELSE
        RAISE NOTICE 'Column(s) do not exist in {table_name} table, skipping index creation';
    END IF;
END$$;--> statement-breakpoint'''

        return conditional_block

    return line

def main():
    input_file = 'drizzle/0027_high_amphibian.sql'
    output_file = 'drizzle/0027_high_amphibian.sql'

    # Read the file
    with open(input_file, 'r') as f:
        lines = f.readlines()

    # Process each line
    fixed_lines = []
    skip_next = False

    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue

        # Check if this line is a CREATE INDEX statement
        if 'CREATE INDEX IF NOT EXISTS' in line and 'DO $$' not in line:
            # Check if the next line is part of a conditional block we already added
            if i + 1 < len(lines) and 'DO $$' in lines[i + 1]:
                # Already fixed, keep as is
                fixed_lines.append(line)
                continue

            # Fix this line
            fixed_line = fix_index_creation(line)
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)

    # Write back to the same file
    with open(output_file, 'w') as f:
        f.writelines(fixed_lines)

    print(f"Fixed migration file: {output_file}")

if __name__ == '__main__':
    main()