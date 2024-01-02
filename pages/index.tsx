import { HTMLProps, useCallback, useEffect, useRef, useState } from "react";
import { initDuckDb, runQuery } from "next-utils/parquet"
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import useSessionStorageState from 'use-session-storage-state'
import css from "./index.module.scss"


const QUERY_KEY = 'duckdb-query'
const DEFAULT_QUERY = `select count(*) from crashes`
const DB_URL_KEY = 'duckdb-db-url'
const DB_URL_VAL_KEY = 'duckdb-db-url-val'
const DEFAULT_DB_URL = "s3://nj-crashes/njdot/2021.duckdb"
const RESULT_KEY = 'duckdb-result'

export function Textarea(
    { title, storageKey, defaultValue = "", ...props }: {
        title: string
        storageKey: string
        defaultValue?: string
    } & Partial<HTMLProps<HTMLTextAreaElement>>
) {
    const [ value, setValue ] = useSessionStorageState<string>(storageKey, { defaultValue })
    return <>
        <h2>{title}:</h2>
        <textarea
            className={css.query}
            value={value}
            onChange={e => {
                const value = (e.target as HTMLTextAreaElement).value
                setValue(value)
            }}
            {...props}
        />
    </>
}

export default function Page() {
    const [ dbUrl, setDbUrl ] = useSessionStorageState<string>(DB_URL_KEY, { defaultValue: DEFAULT_DB_URL })
    const [ db, setDb ] = useState<AsyncDuckDB | null>(null)
    const ref = useRef<HTMLTextAreaElement>(null);
    const [ result, setResult ] = useSessionStorageState<any>(RESULT_KEY, { defaultValue: null })
    useEffect(
        () => {
            initDuckDb({ path: dbUrl, }).then(db => setDb(db))
        },
        [ dbUrl ]
    )
    const run = useCallback(
        () => {
            if (!db) {
                console.error("no db")
                return
            }
            const query = ref.current?.value
            if (!query) {
                return
            }
            console.log("running query:", query)
            runQuery(db, query).then(result => {
                console.log("result:", result)
                setResult(result)
            })
        },
        [ db ]
    )
    return <div className={css.main}>
        <div className={css.row}>
            <Textarea
                title={"Database"}
                storageKey={DB_URL_VAL_KEY}
                defaultValue={DEFAULT_DB_URL}
                className={css.dbUrl}
                onKeyDown={e => {
                    if (e.code === 'Enter') {
                        e.preventDefault();
                        const newDb = (e.target as HTMLTextAreaElement).value
                        console.log("new db:", newDb)
                        setDbUrl(newDb)
                    }
                }}
            />
        </div>
        <div className={css.row}>
            <Textarea
                title={"Query"}
                className={css.query}
                storageKey={QUERY_KEY}
                defaultValue={DEFAULT_QUERY}
                onKeyDown={e => {
                    // console.log("key:", e.code, e)
                    if (e.code === 'Enter' && e.shiftKey) {
                        e.preventDefault();
                        run()
                    }
                }}
            />
        </div>
        <div className={css.row}>
            <button
                type={"button"}
                className={css.button}
                onClick={() => { run() }}
            >
                Run
            </button>
        </div>
        <div className={css.row}>
            <h2>Result:</h2>
            <pre>{
                result &&
                JSON.stringify(result, null, 2)
            }</pre>
        </div>
    </div>
}
