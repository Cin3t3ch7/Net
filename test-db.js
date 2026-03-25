const { Client } = require("pg");

const connectionString =
    "postgresql://neondb_owner:npg_VKnZObgfqB42@ep-summer-butterfly-am8j3sec-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const client = new Client({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 10000,
});

async function testConnection() {
    try {
        console.log("Intentando conectar a Neon PostgreSQL...");

        await client.connect();
        console.log("✅ Conexión exitosa");

        const result = await client.query(`
      SELECT
        NOW() AS server_time,
        current_database() AS database_name,
        current_user AS user_name,
        version() AS postgres_version
    `);

        console.table(result.rows);
    } catch (error) {
        console.error("❌ Error de conexión");
        console.error("Mensaje:", error.message);
        console.error("Código:", error.code || "N/A");
    } finally {
        await client.end().catch(() => { });
        console.log("Conexión cerrada.");
    }
}

testConnection();