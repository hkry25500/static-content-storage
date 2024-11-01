import { NodeCacheType } from "./enums"


export interface IMovieParams
{
    quality?: string
}

export interface INodeCacheObject
{
    type: NodeCacheType,
    value: any
}

export interface IConfigIMDb
{
    name: string
    id: string
    description: string
    director: string
    writers: string[]
    poster: { source: string, url: string }
    sources: { internal: {url: string}, external: {url:string} }
}