const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const dotenv = require("dotenv");

dotenv.config();

const s3Client = new S3Client({
  region: process.env.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const PROJECT_ID = process.env.PROJECT_ID;

const init = async () => {
  console.log("Executing script.js");

  const outDirPath = path.join(__dirname, "output");
  const command = exec(`cd ${outDirPath} && npm install && npm run build`);

  command.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  command.stdout.on("error", (data) => {
    console.error("Error", data.toString());
  });

  command.on("close", async () => {
    console.log("Build Complete");

    const distDirPath = path.join(__dirname, "output", "dist");
    const distDirContents = fs.readdirSync(distDirPath, { recursive: true });

    for (const filePath of distDirContents) {
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("Uploading: ", filePath);

      const cmd = PutObjectCommand({
        Bucket: "velocity-theneelshah",
        Key: `__outputs/${PROJECT_ID}/${filePath}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(cmd);

      console.log("Uploaded: ", filePath);
    }

    console.log("Done...");
  });
};

init();
