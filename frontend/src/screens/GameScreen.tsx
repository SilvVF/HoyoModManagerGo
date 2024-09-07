import { useEffect, useState } from "react"
import { DataApi } from "../data/dataapi"
import { syncCharacters } from "../data/sync"
import { useStateProducer } from "../lib/utils"
import { types } from "wailsjs/go/models"
import { EnableModById } from "../../wailsjs/go/core/DbHelper"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"


function GameScreen(props: {dataApi: DataApi}) {

    const [refreshTrigger, setRefreshTrigger] = useState(0)

    useEffect(() => {
      syncCharacters(props.dataApi, 0)
    }, [props.dataApi])



    const enableMod = async (id: number, enabled: boolean) => {
      EnableModById(enabled, id).then(() => setRefreshTrigger(prev => prev + 1))
    }

    const characters = useStateProducer<types.CharacterWithModsAndTags[]>([], async (update) => {
        update(await props.dataApi.charactersWithModsAndTags())
    }, [props.dataApi, refreshTrigger])
  
    return (
      <div className="h-full w-full">
        <div className="absolute bottom-0 end-12 flex flex-row z-10">
        <Button
        className="mx-2" 
        onClick={() => syncCharacters(props.dataApi, 1).then(() => setRefreshTrigger(prev => prev + 1))}>
          Refresh Local
        </Button>
        <Button 
        onClick={() => syncCharacters(props.dataApi, 2).then(() => setRefreshTrigger(prev => prev + 1))}>
          Refresh
        </Button>
        </div>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
          {
            characters.map((c) => (
              <div className="col-span-1">
                <CharacterBox enableMod={enableMod} cmt={c}/>
              </div>
            ))
          }      
        </div>
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
          cmt.modWithTags.map((mwt) => {
            return (
              <div className="flex flex-row justify-start m-1" key={mwt.mod.id}>
                   <Switch
                    className="" 
                    checked={mwt.mod.enabled} 
                    onCheckedChange={() => enableMod(mwt.mod.id, !mwt.mod.enabled)} />
                <b className="text-sm mr-auto ps-2 overflow-ellipsis">{mwt.mod.filename}</b>
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