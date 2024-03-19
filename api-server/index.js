const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const subscriber = new Redis(
  `rediss://default:${process.env.REDIS_PWD}@redis-2bb89c66-velocity-redis.a.aivencloud.com:23782`
);
const io = new Server({ cors: "*" });
const PORT = 9000;

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

io.listen(9001, () => {
  console.log("Socket server running on 9001");
});

const initRedisSubscribe = async () => {
  console.log("Subscribed to logs...");
  subscriber.psubscribe("logs*");
  subscriber.on("message", (pattern, channel, message) => [
    io.to(channel).emit("message", message),
  ]);
};

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:us-west-1:011248849010:cluster/builder-cluster-ecs",
  TASK: "arn:aws:ecs:us-west-1:011248849010:task-definition/builder-task",
};

app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitURL } = req.body;
  console.log(req.body);

  const projectSlug = generateSlug();

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: ["subnet-08213cfcd53679dce", "subnet-037b6d31775f1f6a8"],
        securityGroups: ["sg-09a0060e655b96ad8"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image",
          environment: [
            { name: "GIT_REPOSITORY_URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: "queued",
    data: {
      projectSlug,
      url: `http://${projectSlug}.localhost:8000`,
    },
  });
});

initRedisSubscribe();
app.listen(PORT, () => console.log(`API Server running on: ${PORT}`));
