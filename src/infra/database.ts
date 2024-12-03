import pg from 'pg';
const { Client } = pg;
import * as path from "path";
import * as dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../../.env.development");
dotenv.config({ path: envPath });

async function query(queryObject: any, array?: any) {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl:getSSLValues()
  });
  await client.connect();
  try {
    const result = await client.query(queryObject, array);
    return result;
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}
function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }

  return process.env.NODE_ENV === "production" ? true : true;
}
export default {
  query: query,
};
