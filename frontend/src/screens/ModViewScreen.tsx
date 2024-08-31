import { cn, useStateProducer } from "@/lib/utils";
import * as GbApi from "../../wailsjs/go/api/GbApi";
import { api, types } from "../../wailsjs/go/models";
import { useParams } from "react-router-dom";
import { LogPrint } from "../../wailsjs/runtime/runtime";
import { SelectModsByCharacterName, SelectClosestCharacter } from "../../wailsjs/go/core/DbHelper";
import * as Downloader from "../../wailsjs/go/core/Downloader";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function ModViewScreen() {
  const { id } = useParams();

  const content = useStateProducer<api.ModPageResponse | undefined>(
    undefined,
    async (update) => {
      LogPrint(id ?? "undefinded");
      const page = await GbApi.ModPage(Number(id));
      update(page);
    },
    [id]
  );


  const character = useStateProducer<types.Character | undefined>(
    undefined,
    async (update) => {
      const cName = content?._aCategory?._sName;
      if (cName !== undefined) {
        SelectClosestCharacter(cName, 0).then((character) => update(character));
      }
    },
    [content]
  );

  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const downloaded = useStateProducer<types.Mod[]>(
    [],
    async (update) => {
        if (character !== undefined) {
            SelectModsByCharacterName(character.name, character.game).then((mods) => update(mods))
        }
    },
    [character, refreshTrigger]
  )

  const deleteMod = async (id: number) => {
      Downloader.Delete(id).then(() => refresh())
  }

  const [downloadsInProgress, setDownloadsInProgress] = useState<string[]>([])

  const refresh = async () => {
    setRefreshTrigger((prev) => prev + 1)
  } 

  const download = async (link: string, filename: string) => {
    if (character !== undefined && content?._idRow !== undefined) {
      setDownloadsInProgress((prev) => [...prev, filename])
      Downloader.Donwload(
            link, 
            filename,
            character.name, 
            character.id,
            character.game, 
            content?._idRow
        )
        .finally(() => {
            refresh()
            setDownloadsInProgress((prev) => prev.filter((it) => it !== filename))
        })
    }
  };

  return (
    <div className="flex flex-col min-w-screen h-full">
      <img
        src={character?.avatarUrl}
        className="object-contain aspect-square h-96"
      ></img>
      <b>{character?.name}</b>
      <Table>
        <TableCaption>Mods available to download.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {content?._aFiles?.map((f) => {
            return (
                <TableRow>
                    <TableCell className="font-medium">{f._sFile}</TableCell>
                    <TableCell>{f._tsDateAdded}</TableCell>
                    <TableCell>
                        {
                            [f._sClamAvResult, f._sAvastAvResult, f._sAnalysisResult].map((result) => {
                                if (result) {
                                    return <Button size="sm" className={cn(result === "clean" || result === "File passed analysis" ? "bg-green-800" : "bg-red-800", "mx-2 h-6")} variant="secondary">{result}</Button>
                                } 
                            })
                        }
                    </TableCell>
                    <TableCell className="text-right min-w-[64px] m-2">
                        <DownloadButton 
                        downloaded={
                            downloaded.map((it) => it.gbFileName.toLowerCase())
                            .includes(f._sFile?.toLowerCase() ?? "")
                        }
                        onDeleteClick={() => {
                          const mod = downloaded.find((it) => it.gbFileName.toLowerCase() === f._sFile?.toLowerCase() ?? "")
                          if (mod) {
                            deleteMod(mod.id)
                          }
                        }}
                        downloading={downloadsInProgress.includes(f._sFile ?? "")} 
                        onDownloadClick={() => download(f._sDownloadUrl ?? "", f._sFile ?? "")}
                        />
                    </TableCell>
                </TableRow>
            );
        }) ?? <></>}
        </TableBody>
      </Table>
    </div>
  );
}


function DownloadButton(
    props: {
        downloading: boolean,
        downloaded: boolean,
        onDownloadClick: () => void,
        onDeleteClick: () => void,
    }
) {
    if (props.downloading) {
        return (
            <div className="inset-0 flex h-[--container-height] w-full items-center justify-end gap-2 bg-background text-sm text-muted-foreground">
                <svg className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                {...props}
                >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Downloading...
          </div>
        )
    }

    if (props.downloaded) {
        return (
            <Button onClick={props.onDeleteClick} variant="outline" size="icon" className="fade-in fade-out">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>
            </Button>
        )
    }

    return(
        <Button onClick={props.onDownloadClick} variant="outline" size="icon" className="fade-in fade-out">
           <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
            </svg>
        </Button>
    )
}