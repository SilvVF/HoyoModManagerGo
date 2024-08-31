import { useEffect, useState } from "react"
import { DataApi } from "../data/dataapi"
import { syncCharacters } from "../data/sync"
import { useStateProducer } from "../lib/utils"
import { types } from "wailsjs/go/models"
import { EnableModById } from "../../wailsjs/go/core/DbHelper"
import { Switch } from "@/components/ui/switch"


function GameScreen(props: {dataApi: DataApi}) {

    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
      syncCharacters(props.dataApi)
    }, [props.dataApi])


    const enableMod = async (id: number, enabled: boolean) => {
      EnableModById(enabled, id).then(() => setRefreshTrigger(prev => prev + 1))
    }

    const characters = useStateProducer<types.CharacterWithModsAndTags[]>([], async (update) => {
        update(await props.dataApi.charactersWithModsAndTags())
    }, [props.dataApi, refreshTrigger])
  
    return (
        <div className="grid grid-cols-4">
          {
            characters.map((c) => (
              <div className="col-span-1">
                <CharacterBox enableMod={enableMod} cmt={c}/>
              </div>
            ))
          }      
        </div>
    )
}

function CharacterBox({ cmt, enableMod  }: { cmt: types.CharacterWithModsAndTags, enableMod: (id: number, enabled: boolean) => void }) {

  const character: types.Character = cmt.characters

  return (
    <div className="aspect-square">
      <img src={character.avatarUrl}></img>
      <b>{character.name}</b>
      {
        cmt.mods.map((mod) => {
          return (
            <div className="flex flex-row" key={mod.id}>
              <b>{mod.filename}</b>
              <Switch checked={mod.enabled} onCheckedChange={() => enableMod(mod.id, !mod.enabled)} />
            </div>
          )
        })
      }
      <b>{cmt.mods.toString()}</b>
      <b>{cmt.tags.toString()}</b>
    </div>
  ) 
}

export default GameScreen