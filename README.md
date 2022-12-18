# Go test coverage checker

## Example workflow

```yaml
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.19'
      - name: Go test and check coverage
        uses: hiwayapp/actions-go-test-coverage-checker@v1.2
        with:
          threshold: 60

```
