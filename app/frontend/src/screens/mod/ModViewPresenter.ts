import { DataApi, Game } from "@/data/dataapi";
import DB from "@/data/database";
import { useStateProducer } from "@/lib/utils";
import { dlStates, State, useDownloadStore } from "@/state/downloadStore";
import { useEffect, useMemo, useState } from "react";
import { api, types } from "wailsjs/go/models";
import { useShallow } from "zustand/shallow";
import * as Downloader from "../../../wailsjs/go/core/Downloader";
import * as GbApi from "../../../wailsjs/go/api/GbApi";

export const inDownloadState = (state: State | undefined) => {
    if (state) {
        return dlStates.includes(state);
    }
    return false;
};

export type ModViewEvent = {
    changeCharacter: (character: types.Character) => void
    downloadTexture: (
        link: string,
        filename: string,
        modId: number
    ) => void
    downloadMod: (link: string, filename: string) => void,
    deleteMod: (id: number) => void
}

export type ModViewState = {
    filesWithDownload: ApiFile[],
    character: types.Character | undefined,
    mods: types.Mod[]
    downloaded: types.Mod[]
    downloadStates: { [link: string]: State },
    images: string[]
    events: ModViewEvent,
    htmlContent: string,
}

export type ApiFile = {
    dlLink: string,
    fname: string,
    dateAdded: number,
    downloadedMod: types.Mod | undefined,
    avResults: AVResult[]
}


export type AVResult = {
    result: string;
    type: string;
    clean: boolean;
}

const createAvResults = (file: api.AFile): AVResult[] => {
    return [
        { result: file._sClamAvResult, type: "clam av" },
        { result: file._sAvastAvResult, type: "avast" },
        { result: file._sAnalysisResult, type: "analysis" }
    ]
        .filter((item) => item.result !== undefined)
        .map(({ result, type }) => {
            return {
                result: result!,
                type: type,
                clean: result === "clean" || result === "File passed analysis" || result === "ok"
            }
        })
}

const toApiFile = (file: api.AFile, downloaded: types.Mod[]): ApiFile | undefined => {
    if (file._sDownloadUrl === undefined || file._sFile === undefined) {
        return undefined
    }

    return {
        dlLink: file._sDownloadUrl!,
        fname: file._sFile!,
        downloadedMod: downloaded.find((mod) =>
            file._sFile !== undefined &&
            mod.gbFileName.toLowerCase() === file._sFile?.toLowerCase()
        ),
        avResults: createAvResults(file),
        dateAdded: file._tsDateAdded ?? 0
    }
}

export const useModViewPresenter = (id: string | undefined, dataApi: DataApi): ModViewState => {
    const running = useDownloadStore(useShallow((state) => state.running));
    const [character, setCharacter] = useState<types.Character | undefined>(
        undefined
    );
    const game = useStateProducer<number | undefined>(undefined, (update) => {
        dataApi.game().then(update)
    })
    const content = useStateProducer<api.ModPageResponse | undefined>(
        undefined,
        async (update) => {
            const page = await GbApi.ModPage(Number(id));
            update(page);
        },
        [id]
    );


    const mods = useStateProducer<types.Mod[]>(
        [],
        async (update, onDispose) => {
            if (character) {
                const cancel = DB.onValueChangedListener("mods", () => {
                    DB.selectModsByCharacterName(character.name, character.game).then(update);
                }, true)

                onDispose(cancel)
            }
        },
        [character]
    );

    const downloaded = useStateProducer<types.Mod[]>(
        [],
        async (update, onDispose) => {
            const cancel = DB.onValueChangedListener("mods", async () => {
                const mods = await DB.selectModsByGbId(Number(id))
                const filtered = mods.filter(m => m.characterId === character?.id)
                update(filtered)
            }, true)

            onDispose(cancel)
        },
        [running, id, character]
    );


    useEffect(() => {
        let cname = content?._aCategory?._sName;
        let done = false
        if (cname === undefined || dataApi === undefined || game === undefined) return

        let names = [cname]
        if (game === Game.ZZZ) {
            names = cname.split(" ")
        }

        for (const name of names) {
            DB.selectClosestCharacter(name, game)
                .then((result) => {
                    if (!done && character === undefined) {
                        setCharacter(result)
                    }
                })
        }

        return () => {
            done = true
        }
    }, [content, dataApi, game]);

    const downloadStates: { [link: string]: State } = useDownloadStore(
        useShallow((state) =>
            Object.fromEntries(
                Object.entries(state.downloads)
                    .map(([link, download]) => [link, download.state])
            )
        ));


    const images = useMemo(() => {
        return (
            content?._aPreviewMedia?._aImages
                ?.map((image) => `${image._sBaseUrl}/${image._sFile}`)
                ?.filter((url) => url !== undefined)
            ?? []
        );
    }, [content]);

    const filesWithDownload = useMemo(() => {
        return content
            ?._aFiles
            ?.map((file) => toApiFile(file, downloaded))
            .filter((file) => file !== undefined)
            ?? []
    }, [content, downloaded])

    return {
        filesWithDownload: filesWithDownload,
        downloaded: downloaded,
        mods: mods,
        images: images,
        downloadStates: downloadStates,
        character: character,
        htmlContent: content?._sText ?? "",
        events: {
            changeCharacter: (c) => setCharacter(c),
            downloadMod: (link: string, filename: string) => {
                if (character !== undefined && content?._idRow !== undefined) {
                    Downloader.Download(
                        link,
                        filename,
                        character.name,
                        character.id,
                        character.game,
                        content?._idRow,
                        images
                    );
                }
            },
            downloadTexture: (
                link: string,
                filename: string,
                modId: number
            ) => {
                if (character !== undefined && content?._idRow !== undefined) {
                    Downloader.DownloadTexture(
                        link,
                        filename,
                        modId,
                        content?._idRow,
                        images
                    );
                }
            },
            deleteMod: (id: number) => {
                DB.deleteMod(id);
            }
        }
    }
}