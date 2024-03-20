Container based cloud hosting platform

- Orchestrated an API server to feed the GitHub repository's URL and project id in AWS ECS cluster task to spin a container
- Developed a Docker image on AWS ECR to clone, build, and push static files from GitHub repository to AWS S3
- Established a reverse proxy to route subdomains to corresponding static assets within an S3 bucket
- Utilized the Aiven Redis pipeline to publish logs from image and subscribe them via a socket stream from the API server
