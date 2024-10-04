import { types } from "wailsjs/go/models"
import * as Stats from "wailsjs/go/core/Stats"



export async function getStats(): Promise<types.DownloadStats> {
    return await Stats.GetStats()
}