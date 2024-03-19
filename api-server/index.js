const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const PORT = 9000;

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

app.listen(PORT, () => console.log(`API Server running on: ${PORT}`));
