import { DataApi } from "@/data/dataapi";
import DB, { useDbQuery } from "@/data/database";
import { dlStates, State, useDownloadStore } from "@/state/downloadStore";
import { useEffect, useMemo, useState } from "react";
import { api, types } from "wailsjs/go/models";
import { useShallow } from "zustand/shallow";
import * as Downloader from "../../../wailsjs/go/core/Downloader";
import * as GbApi from "../../../wailsjs/go/api/GbApi";
import { useResource } from "@/lib/utils";

export const inDownloadState = (state: State | undefined) => {
  if (state) {
    return dlStates.includes(state);
  }
  return false;
};

export type ModViewEvent = {
  changeCharacter: (character: types.Character) => void;
  downloadTexture: (link: string, filename: string, modId: number) => void;
  downloadMod: (link: string, filename: string) => void;
  deleteMod: (id: number) => void;
};

export type ModViewState = {
  filesWithDownload: ApiFile[];
  character: types.Character | undefined;
  mods: types.Mod[];
  downloaded: types.Mod[];
  downloadStates: { [link: string]: State };
  images: string[];
  events: ModViewEvent;
  htmlContent: string;
};

export type ApiFile = {
  dlLink: string;
  fname: string;
  dateAdded: number;
  downloadedMod: types.Mod | undefined;
  avResults: AVResult[];
};

export type AVResult = {
  result: string;
  type: string;
  clean: boolean;
};

const createAvResults = (file: api.AFile): AVResult[] => {
  return [
    { result: file._sClamAvResult, type: "clam av" },
    { result: file._sAvastAvResult, type: "avast" },
    { result: file._sAnalysisResult, type: "analysis" },
  ]
    .filter((item) => item.result !== undefined)
    .map(({ result, type }) => {
      return {
        result: result!,
        type: type,
        clean:
          result === "clean" ||
          result === "File passed analysis" ||
          result === "ok",
      };
    });
};

const toApiFile = (
  file: api.AFile,
  downloaded: types.Mod[],
): ApiFile | undefined => {
  if (file._sDownloadUrl === undefined || file._sFile === undefined) {
    return undefined;
  }

  return {
    dlLink: file._sDownloadUrl!,
    fname: file._sFile!,
    downloadedMod: downloaded.find(
      (mod) =>
        file._sFile !== undefined &&
        mod.gbFileName.toLowerCase() === file._sFile?.toLowerCase(),
    ),
    avResults: createAvResults(file),
    dateAdded: file._tsDateAdded ?? 0,
  };
};

export const useModViewPresenter = (
  id: string | undefined,
  dataApi: DataApi,
): ModViewState => {
  const running = useDownloadStore(useShallow((state) => state.running));
  const [character, setCharacter] = useState<types.Character | undefined>(
    undefined,
  );
  const game = useResource(dataApi.game, [dataApi]);
  const content = useResource(() => GbApi.ModPage(Number(id)), [id]);

  const { data: mods } = useDbQuery(
    () =>
      DB.queries.selectModsByCharacterName(
        character?.name ?? "",
        character?.game ?? -1,
      ),
    ["mods"],
    [character],
    character !== undefined,
  );

  const { data: downloaded } = useDbQuery(
    async () => {
      const mods = await DB.queries.selectModsByGbId(Number(id));
      const filtered = mods.filter((m) => m.characterId === character?.id);
      return filtered;
    },
    ["mods"],
    [running, id, character],
  );

  const loadCharacter = async (
    cname: string,
    game: number,
    isCanceled: () => boolean,
  ) => {
    const tryLoad = async (name: string): Promise<boolean> => {
      try {
        const result = await DB.queries.selectClosestCharacter(name, game);
        if (!isCanceled()) setCharacter(result);
        return true;
      } catch {
        return false;
      }
    };

    if (await tryLoad(cname)) return;

    for (const name of cname.split(" ")) {
      if (isCanceled()) return;
      if (await tryLoad(name)) return;
    }
  };

  useEffect(() => {
    let cname = content?._aCategory?._sName;
    if (cname === undefined || game === undefined) {
      return;
    }

    let done = false;
    loadCharacter(cname, game, () => done);

    return () => {
      done = true;
    };
  }, [content, dataApi, game]);

  const downloadStates: { [link: string]: State } = useDownloadStore(
    useShallow((state) =>
      Object.fromEntries(
        Object.entries(state.downloads).map(([link, download]) => [
          link,
          download.state,
        ]),
      ),
    ),
  );

  const images = useMemo(() => {
    return (
      content?._aPreviewMedia?._aImages
        ?.map((image) => `${image._sBaseUrl}/${image._sFile}`)
        ?.filter((url) => url !== undefined) ?? []
    );
  }, [content]);

  const filesWithDownload = useMemo(() => {
    return (
      content?._aFiles
        ?.map((file) => toApiFile(file, downloaded ?? []))
        .filter((file) => file !== undefined) ?? []
    );
  }, [content, downloaded]);

  return {
    filesWithDownload: filesWithDownload,
    downloaded: downloaded ?? [],
    mods: mods ?? [],
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
            images,
          );
        }
      },
      downloadTexture: (link: string, filename: string, modId: number) => {
        if (character !== undefined && content?._idRow !== undefined) {
          Downloader.DownloadTexture(
            link,
            filename,
            modId,
            content?._idRow,
            images,
          );
        }
      },
      deleteMod: (id: number) => {
        DB.mutations.deleteMod(id);
      },
    },
  };
};
