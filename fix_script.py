# Read the file
with open("app/frontend/src/components/Marketplace/Dashboard/SellerDashboard.tsx", "r") as f:
    content = f.read()

# Fix the specific line break issue
# Find the pattern where "to-br" is at the end of a line followed by " from" at the start of the next line
content = content.replace('to-br\n from', 'to-br from')

# Write the fixed content back to the file
with open("app/frontend/src/components/Marketplace/Dashboard/SellerDashboard.tsx", "w") as f:
    f.write(content)
