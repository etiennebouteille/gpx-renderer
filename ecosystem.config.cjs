module.exports = {
    apps: [
        {
            name: 'birdview',
            script: 'node ./app.js --exp-backoff-restart-delay=100',
            env: {
                AWS_ACCESS_KEY_ID: 'SCWN7W3YHBZZ8HMSTD59',
                AWS_SECRET_ACCESS_KEY: '796a88e6-4740-4fcc-9854-71a65e7cbbd8',
                SCALEWAY_INSTANCE_ID: 'ff6a2652-9034-4886-963b-42e1f56111bc',
            },
        },
    ],
}
