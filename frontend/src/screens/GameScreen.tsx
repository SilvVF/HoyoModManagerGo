import { useEffect, useState } from "react"
import { DataApi } from "../data/dataapi"
import { syncCharacters } from "../data/sync"
import { useStateProducer } from "../lib/utils"
import { types } from "wailsjs/go/models"
import { EnableModById } from "../../wailsjs/go/core/DbHelper"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"


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
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
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
    <Card className="m-2">
      <div className="flex flex-row  m-2">
        <div className="flex flex-col items-start">
          <img src={character.avatarUrl}></img>
          <b className="text-lg p-2">{character.name}</b>
        </div>
        <ScrollArea className="flex flex-col max-h-[300px] w-full">
        {
          cmt.mods.map((mod) => {
            return (
              <div className="flex flex-row justify-between m-2" key={mod.id}>
                <b className="text-sm pe-2">{mod.filename}</b>
                <Switch checked={mod.enabled} onCheckedChange={() => enableMod(mod.id, !mod.enabled)} />
              </div>
            )
          })
        }
        </ScrollArea>
      </div>
    </Card>
  ) 
}

export default GameScreen