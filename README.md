# duckdb-wasm-test
Measure data fetched when [duckdb-wasm] queries `.duckdb` files in S3

## Examples

### Fetch 1 row
Fetch 1 row from each of several `s3://duckdb-wasm-test/*.duckdb` files in S3:
![](fetch-1/fetched.png)
(see [fetch-1/](fetch-1/))

### Fetch 1 row with a specific `id`

![](select-1/fetched.png)
(see [select-1/](select-1/))

## Methods

### 1. Perform queries, download `.har` file

```bash
npm install
next dev
```

Open the resulting server (likely at http://localhost:3000/), or visit [runsascoded.com/duckdb-wasm-test](https://runsascoded.com/duckdb-wasm-test/):

![](duckdb-wasm-test%20screenshot.png)

1. Enter query
1. Clear "Network" tab
1. Filter: ".duckdb"
1. "Disable cache" ✅
1. "Run all"
1. Download .har file

### 2. Analyze `.har` file
Move `.har` file to this directory, and give it a name; two examples in this repo:
- `fetch-1.har` (`select * from crashes limit 1`; see [fetch-1/](fetch-1/))
- `select-1.har` (`select * from crashes where id=50000`; see [select-1/](select-1/))

Then run [analyze-reqs.ipynb](analyze-reqs.ipynb) on it:

```bash
pip install -r requirements.txt
name=fetch-1  # use your .har file's stem
mkdir -p "$name"
papermill -p name "$name" analyze-reqs.ipynb "$name/analyze-reqs.ipynb"
```

The `$name/` directory will contain a `fetched.png` like the plots above.

[duckdb-wasm]: https://github.com/duckdb/duckdb-wasm
