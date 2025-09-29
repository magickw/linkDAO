Quick DB persistence verification

This project includes a small script to inspect chat persistence in a Postgres instance.

1) Start a Postgres instance (example using Docker):

   docker run --rm --name linkdao-dev-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=linkdao -p 5432:5432 -d postgres:15

2) Set DATABASE_URL and run the verify script:

   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/linkdao
   cd app/backend
   npx ts-node --transpile-only src/scripts/verifyChatPersistence.ts

The script will attempt to read from `conversations`, `chat_messages`, and `messages` tables and print rows found.

If Docker is not available, point `DATABASE_URL` to any reachable Postgres instance and run the script.
