import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import {
  CharacterInfoCard,
  ModActionsDropDown,
  TextureActionDropDown,
} from "@/components/CharacterInfoCard";
import { Separator } from "@/components/ui/separator";
import { Dialog } from "@/components/ui/dialog";
import useTransitionNavigate from "@/hooks/useCrossfadeNavigate";
import { SplitTexture } from "wailsjs/go/main/App";
import { useDialogStore } from "@/components/appdialog";
import DB from "@/data/database";
import { useSearchStore } from "@/state/searchStore";

export function SearchScreen() {
  const navigate = useTransitionNavigate();
  const results = useSearchStore(useShallow((state) => state.results));

  const setDialog = useDialogStore(useShallow((s) => s.setDialog));

  const refreshCharacters = useSearchStore((state) => state.onSearch);

  const deleteMod = async (id: number) => {
    DB.mutations.deleteMod(id).then(refreshCharacters);
  };

  const enableMod = async (id: number, enabled: boolean) => {
    DB.mutations.enableMod(id, enabled).then(refreshCharacters);
  };

  const deleteTexture = async (id: number) => {
    DB.mutations.deleteTexture(id).then(refreshCharacters);
  };

  const splitTexture = async (id: number) => {
    SplitTexture(id).then(refreshCharacters);
  };

  const enableTexture = async (id: number, enabled: boolean) => {
    DB.mutations.enableTexture(id, enabled).then(refreshCharacters);
  };

  return (
    <div className="justify-top flex h-full w-full flex-col items-center">
      <SearchBar />
      <div className="flex w-full flex-col p-4">
        <h3>
          Search specific categorys by prefixing with a bang '!' ex. !character
          Ayaka. Also urls in the form of https://gamebanana.com/mods/(.+)/
        </h3>
        <div className="flex flex-row space-x-4 p-4">
          <h6>!tag</h6>
          <Separator orientation="vertical" />
          <h6>!mod</h6>
          <Separator orientation="vertical" />
          <h6>!character</h6>
          <Separator orientation="vertical" />
          <h6>!game</h6>
          <Separator orientation="vertical" />
          <h6>!g 'global'</h6>
          <Separator orientation="vertical" />
          <h6>!texture</h6>
        </div>
      </div>
      <Dialog>
        {results.urlResults.map((res) => (
          <Button onClick={() => navigate(res.path)}>{res.text}</Button>
        ))}
        <div className="mx-2 grid w-full grid-cols-1 gap-4 space-y-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.dataResults.map((res) => {
            return (
              <div key={res.characters.id} className="mb-4 break-inside-avoid">
                <CharacterInfoCard
                  key={res.characters.id}
                  enableMod={enableMod}
                  cmt={res}
                  modDropdownMenu={(mwt) => (
                    <ModActionsDropDown
                      onEnable={() => enableMod(mwt.mod.id, !mwt.mod.enabled)}
                      onDelete={() => deleteMod(mwt.mod.id)}
                      onRename={() =>
                        setDialog({
                          type: "rename_mod",
                          id: mwt.mod.id,
                          refresh: refreshCharacters,
                        })
                      }
                      onView={() => {
                        if (mwt.mod.gbId !== 0) {
                          navigate(`/mods/${mwt.mod.gbId}`);
                        }
                      }}
                      onKeymapEdit={() => navigate(`/keymap/${mwt.mod.id}`)}
                      addTag={() =>
                        setDialog({
                          type: "add_tag",
                          mod: mwt.mod,
                          refresh: refreshCharacters,
                        })
                      }
                    />
                  )}
                  textureDropdownMenu={(t) => (
                    <TextureActionDropDown
                      onSplit={() => splitTexture(t.id)}
                      onEnable={() => enableTexture(t.id, !t.enabled)}
                      onDelete={() => deleteTexture(t.id)}
                      onRename={() =>
                        setDialog({
                          type: "rename_texture",
                          id: t.id,
                          refresh: refreshCharacters,
                        })
                      }
                      onView={() => {
                        if (t.gbId !== 0) {
                          navigate(`/mods/${t.gbId}`);
                        }
                      }}
                    />
                  )}
                  enableTexture={enableTexture}
                />
              </div>
            );
          })}
        </div>
      </Dialog>
    </div>
  );
}

function SearchBar() {
  const onSearchChange = useSearchStore((state) => state.onQueryChange);
  const query = useSearchStore(useShallow((state) => state.query));
  const onSearch = useSearchStore((state) => state.onSearch);
  const handleChange = (event: any) => {
    onSearchChange(event.target.value);
  };

  return (
    <div className="flex w-3/4 items-center space-x-2">
      <Input
        value={query}
        className="m-4 p-4"
        placeholder="Search..."
        onInput={handleChange}
        onSubmit={onSearch}
      />
      <Button size="icon" onClick={onSearch}>
        <SearchIcon />
      </Button>
    </div>
  );
}
