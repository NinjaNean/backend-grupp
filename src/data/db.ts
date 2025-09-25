import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const accessKey: string = process.env.PUBLIC_KEY || "";
const secretAccessKey: string = process.env.SECRET_KEY || "";

const client: DynamoDBClient = new DynamoDBClient({
  region: "eu-north-1",
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
});

const db: DynamoDBDocumentClient = DynamoDBDocumentClient.from(client);
const myTable: string = "group-table";

export { db, myTable };
