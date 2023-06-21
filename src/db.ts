import pg from "pg";

// Connect to the database using the DATABASE_URL environment
export const pool = new pg.Pool();