const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const dotenv = require("dotenv");
const Redis = require("ioredis");

const PROJECT_ID = process.env.PROJECT_ID;

const publisher = new Redis(
  `rediss://default:${process.env.REDIS_PWD}@redis-2bb89c66-velocity-redis.a.aivencloud.com:23782`
);

const publishLog = (log) => {
  console.log(log);
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify(log));
};

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const init = async () => {
  publishLog("Executing script.js");

  const outDirPath = path.join(__dirname, "output");
  const command = exec(`cd ${outDirPath} && npm install && npm run build`);

  command.stdout.on("data", (data) => {
    publishLog(data.toString());
  });

  command.stdout.on("error", (data) => {
    publishLog("Error", data.toString());
  });

  command.on("close", async () => {
    publishLog("Build Complete");

    const distDirPath = path.join(__dirname, "output", "dist");
    const distDirContents = fs.readdirSync(distDirPath, { recursive: true });

    publishLog("Upload started");

    for (const file of distDirContents) {
      const filePath = path.join(distDirPath, file);

      if (fs.lstatSync(filePath).isDirectory()) continue;

      publishLog("Uploading: ", filePath);

      const cmd = new PutObjectCommand({
        Bucket: "velocity-theneelshah",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(cmd);

      publishLog("Uploaded: ", filePath);
    }

    publishLog("Done...");
  });
};

init();
