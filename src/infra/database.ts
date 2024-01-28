import { Client } from "pg";
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
export default {
  query: query,
};
