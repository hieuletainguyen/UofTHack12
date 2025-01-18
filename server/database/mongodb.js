import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.MONGODB_URI;

const client = new MongoClient(url);

export default client;