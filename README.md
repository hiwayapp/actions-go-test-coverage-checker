# Go test coverage checker

<img width="630" alt="2023-02-12_17 20 41" src="https://user-images.githubusercontent.com/12683375/218300471-dae4073f-79d2-45ab-8f40-5a163bef04ff.png">

## Example workflow

```yaml
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.19'
      - name: Go test and check coverage
        uses: hiwayapp/actions-go-test-coverage-checker@v1.3
        with:
          threshold: 60
          logLevel: "info"
          slackWebhookUrl: "https://hooks.slack.com/services/hoge/fuga/abcd"
```
