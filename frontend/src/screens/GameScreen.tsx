import { useEffect } from "react"
import { DataApi } from "../data/dataapi"
import { syncCharacters } from "../data/sync"
import { useStateProducer } from "../lib/utils"
import { types } from "wailsjs/go/models"


function GameScreen(props: {dataApi: DataApi}) {
    useEffect(() => {
      syncCharacters(props.dataApi)
    }, [props.dataApi])

    const characters = useStateProducer<types.CharacterWithModsAndTags[]>([], async (update) => {
        update(await props.dataApi.charactersWithModsAndTags())
    }, [props.dataApi])
  
    return (
        <div className="grid grid-cols-4 gap-0 border-2 border-sky-500">
          {
            characters.map((c) => (
              <div className="col-span-1">
                <CharacterBox cmt={c}/>
              </div>
            ))
          }      
        </div>
    )
}

function CharacterBox({ cmt  }: { cmt: types.CharacterWithModsAndTags }) {

  const character: types.Character = cmt.characters

  return (
    <div className="aspect-square">
      <img src={character.avatarUrl}></img>
      <b>{character.name}</b>
      <b>{cmt.mods.toString()}</b>
      <b>{cmt.tags.toString()}</b>
    </div>
  ) 
}

export default GameScreen