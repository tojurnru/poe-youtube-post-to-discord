# POE Youtube Post To Discord

A script that scans for new videos from a list of youtube content creators and post it to discord.

## Sample Output

![sample output](/readme/sample.png)

## Environment Variables

- `GOOGLE_API_KEY`: follow this [instruction](https://support.google.com/googleapi/answer/6158862?hl=en)
- `DISCORD_WEBHOOK_URL`: follow this [instruction](https://docs.gitlab.com/ee/user/project/integrations/discord_notifications.html)

## How to Use

1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).
1. Copy and edit the content creators you'd like to follow in `youtuber.txt` (must put in their name, case sensitive, and NOT username).
1. Copy `.env.example` and rename it to `.env`, set your API key and Webhook URL.
1. Copy `docker-compose.yaml` and change the directory path.
1. Run `docker-compose up`.
