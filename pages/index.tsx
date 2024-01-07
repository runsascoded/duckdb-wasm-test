import React, { ChangeEventHandler, Dispatch, HTMLProps, useCallback, useEffect, useState } from "react";
import { initDuckDb, runQuery } from "next-utils/parquet"
import { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import useSessionStorageState from 'use-session-storage-state'
import css from "./index.module.scss"

const keys = [
    '1e5', '2e5', '5e5',
    '1e6', '2e6', '4e6', '6e6',
]
const bkt = 'duckdb-repl'
const prefix = `s3://${bkt}`
const dbUrls = ([] as string[]).concat(...keys.map(k => [ `${prefix}/${k}.duckdb`, `${prefix}/${k}-idx.duckdb` ]))

const QUERY_KEY = 'duckdb-query'
const DEFAULT_QUERY = `select count(*) from crashes`
const DB_URL_KEY = 'duckdb-db-url'
const DEFAULT_DB_URL = dbUrls[0]
const RESULT_KEY = 'duckdb-result'

export function Textarea(
    { title, storageKey, defaultValue = "", value, setValue, onChange, ...props }: {
        title: string
        storageKey: string
        defaultValue?: string
        value?: string
        setValue?: Dispatch<string>
        onChange?: ChangeEventHandler<HTMLTextAreaElement> | undefined
    } & Partial<Omit<HTMLProps<HTMLTextAreaElement>, 'onChange'>>
) {
    if (value === undefined || setValue === undefined) {
        if (value === undefined && setValue === undefined) {
            [ value, setValue ] = useSessionStorageState<string>(storageKey, { defaultValue })
        } else{
            throw new Error("either both value and setValue must be defined or neither")
        }
    }

    return <>
        <h2>{title}</h2>
        <textarea
            className={css.query}
            value={value}
            onChange={e => {
                if (onChange) {
                    onChange(e)
                }
                const value = (e.target as HTMLTextAreaElement).value
                setValue && setValue(value)
            }}
            {...props}
        />
    </>
}

export function Repl() {
    const [ dbUrl, setDbUrl ] = useSessionStorageState<string>(DB_URL_KEY, { defaultValue: DEFAULT_DB_URL })
    const [ db, setDb ] = useState<AsyncDuckDB | null>(null)
    const [ query, setQuery ] = useSessionStorageState<string>(QUERY_KEY, { defaultValue: DEFAULT_QUERY })
    const [ result, setResult ] = useSessionStorageState<any>(RESULT_KEY, { defaultValue: null })
    const [ runningAll, setRunningAll ] = useState(false)
    useEffect(
        () => {
            console.log("initializing db:", dbUrl)
            initDuckDb({ path: dbUrl, }).then(db => {
                console.log("setting new db")
                setDb(db)
            })
        },
        [ dbUrl ]
    )
    const run = useCallback(
        () => {
            if (!db) {
                console.error("no db")
                return
            }
            if (!query) {
                return
            }
            setResult(null)
            console.log("running query:", query)
            runQuery(db, query).then(result => {
                console.log("result:", result)
                setResult(result)
            })
        },
        [ db, query ]
    )
    const runAll = useCallback(
        () => {
            if (!query) return
            console.log("running all:", query)
            setRunningAll(true)
            Promise.all(
                dbUrls.map(dbUrl => {
                    const name = dbUrl.split('/').pop()
                    return initDuckDb({ path: dbUrl, }).then(db => {
                        console.log("got db:", name)
                        return runQuery(db, query)
                    }).then(result => {
                        console.log(`db ${name} result:`, result)
                        return [ name, result ]
                    })
                })
            ).then(results => {
                const obj = Object.fromEntries(results)
                console.log("done:", obj)
                setResult(obj)
                setRunningAll(false)
            })
        },
        [ query ]
    )
    useEffect(
        () => {
            console.log("db effect:", db)
            if (!db) return
            run()
        },
        [ db ]
    )
    return <div className={css.main}>
        <div className={css.row}>
            <select
                className={css.dbUrl}
                value={dbUrl}
                onChange={e => {
                    const newDb = (e.target as HTMLSelectElement).value
                    console.log("new db:", newDb)
                    setDbUrl(newDb)
                    setDb(null)
                    setResult(null)
                }}
            >{
                dbUrls.map(dbUrl => <option key={dbUrl} value={dbUrl}>{dbUrl}</option>)
            }</select>
        </div>
        <div className={css.row}>
            <Textarea
                title={"Query"}
                className={css.query}
                value={query}
                setValue={setQuery}
                storageKey={QUERY_KEY}
                defaultValue={DEFAULT_QUERY}
                onKeyDown={e => {
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
            <button
                type={"button"}
                className={css.button}
                disabled={runningAll}
                onClick={() => { runAll() }}
            >
                Run all
            </button>
        </div>
        <div className={css.row}>
            <h2>Result</h2>
            <pre>{
                result && db &&
                JSON.stringify(result, null, 2)
            }</pre>
        </div>
    </div>
}

export default function Page() {
    const [ body, setBody ] = useState<JSX.Element | null>(null)
    useEffect(
        () => {
            console.log("setting body")
            setBody(<Repl />)
        },
        []
    )
    return body
}
