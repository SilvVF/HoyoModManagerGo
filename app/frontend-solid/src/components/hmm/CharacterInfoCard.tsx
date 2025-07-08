import { types } from "wailsjs/go/models";
import { Card } from "../ui/card";
import {
  Accessor,
  ComponentProps,
  createEffect,
  createSignal,
  For,
  onCleanup,
  Setter,
  Show,
} from "solid-js";
import { Switch, SwitchControl, SwitchThumb } from "../ui/switch";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { cn } from "@/libs/cn";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-solid";
import DB from "@/data/database";

export default function CharacterInfoCard(
  props: {
    cwmt: types.CharacterWithModsAndTags;
  } & ComponentProps<"div">
) {
  const character = props.cwmt.characters;
  const mods = props.cwmt.modWithTags;

  return (
    <Card {...props}>
      <div class="flex flex-row">
        <div class="w-1/3 flex flex-col items-center">
          <img
            src={character.avatarUrl}
            class="w-full aspect-square object-cover rounded-md"
          />
          <b class="text-lg p-2 text-center truncate w-full">
            {character.name}
          </b>
        </div>
        <div class="w-2/3 overflow-hidden overflow-y-auto">
          <div class="max-h-[300px] w-full">
            <For each={mods}>{(item) => <ModListItem mod={item} />}</For>
          </div>
        </div>
      </div>
    </Card>
  );
}

const ModListItem = ({ mod }: { mod: types.ModWithTags }) => {
  const [expandTextures, setExpandTextures] = createSignal(false);

  const toggleEnabled = () => {
    DB.mutation.enableMod(mod.mod.id, !mod.mod.enabled);
  };

  const toggleTextureEnabled = (texture: types.Texture) => {
    DB.mutation.enableTexture(texture.id, !texture.enabled);
  };

  return (
    <div class="flex flex-col">
      <ModDisplay
        mod={mod}
        showTextures={expandTextures}
        setShowTextures={setExpandTextures}
        toggleEnabled={toggleEnabled}
      />

      <Show when={expandTextures()}>
        <For each={mod.textures}>
          {(texture) => (
            <TextureDisplay
              texture={texture}
              toggleEnabled={() => toggleTextureEnabled(texture)}
            />
          )}
        </For>
      </Show>
    </div>
  );
};

const useResizeListener = (
  text: string,
  rowRef: HTMLDivElement,
  actionsRef: HTMLDivElement
): Accessor<number> => {
  const [availableWidth, setAvailableWidth] = createSignal(0);

  let frameId: number | undefined = undefined;

  const listener = () => {
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
    }

    frameId = window.requestAnimationFrame(() => {
      const rowWidth = rowRef.clientWidth;
      const controlsWidth = actionsRef.clientWidth;

      setAvailableWidth(rowWidth - controlsWidth);
    });
  };

  window.addEventListener("resize", listener);

  createEffect(() => {
    text;
    rowRef;
    actionsRef;

    listener();
  });

  onCleanup(() => {
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId);
    }
    window.removeEventListener("resize", listener);
  });

  return availableWidth;
};

const TextureDisplay = ({
  texture,
  toggleEnabled,
}: {
  texture: types.Texture;
  toggleEnabled: () => void;
}) => {
  let rowRef!: HTMLDivElement;
  let actionsRef!: HTMLDivElement;

  const availableWidth = useResizeListener(
    texture.filename,
    rowRef,
    actionsRef
  );

  return (
    <div ref={rowRef} class="flex flex-row items-center w-full">
      <div class="flex-grow overflow-hidden mr-1">
        <HoverableText
          text={texture.filename}
          tags={[]}
          images={texture.previewImages}
          availableWidth={availableWidth}
        />
      </div>
      <div ref={actionsRef} class="flex flex-row items-center">
        <Switch
          checked={texture.enabled}
          onChange={() => toggleEnabled()}
          class="w-fit flex items-center space-x-2"
        >
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
        </Switch>
      </div>
    </div>
  );
};

const ModDisplay = ({
  mod,
  showTextures,
  setShowTextures,
  toggleEnabled,
}: {
  mod: types.ModWithTags;
  showTextures: Accessor<boolean>;
  setShowTextures: Setter<boolean>;
  toggleEnabled: () => void;
}) => {
  let rowRef!: HTMLDivElement;
  let actionsRef!: HTMLDivElement;

  const availableWidth = useResizeListener(
    mod.mod.filename,
    rowRef,
    actionsRef
  );

  return (
    <div ref={rowRef} class="flex flex-row items-center w-full">
      <div class="flex-grow overflow-hidden mr-1">
        <HoverableText
          text={mod.mod.filename}
          tags={mod.tags.map((t) => t.name)}
          images={mod.mod.previewImages}
          availableWidth={availableWidth}
        />
      </div>
      <div ref={actionsRef} class="flex flex-row items-center">
        <Switch
          checked={mod.mod.enabled}
          onChange={() => toggleEnabled()}
          class="w-fit flex items-center space-x-2"
        >
          <SwitchControl>
            <SwitchThumb />
          </SwitchControl>
        </Switch>
        {mod.textures.length !== 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTextures((curr) => !curr)}
            class={`${showTextures() ? "rotate-180" : "rotate-0"}`}
          >
            <ChevronDown />
          </Button>
        )}
      </div>
    </div>
  );
};

const HoverableText = ({
  text,
  tags,
  images,
  availableWidth,
}: {
  text: string;
  tags: string[];
  images: string[];
  availableWidth: Accessor<number>;
}) => {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <TextDisplay text={text} availableSpace={availableWidth} />
      </HoverCardTrigger>
      <HoverCardContent class="w-80 h-96 overflow-y-clip flex flex-col">
        <div>Tags: {tags.join(", ")}</div>
        <div>{text}</div>
        <div class="flex flex-row overflow-x-auto h-full justify-between space-x-4">
          <For each={images}>
            {(uri) => (
              <img
                class="object-cover aspect-square w-70 h-70 m-2 rounded-none"
                src={uri}
              />
            )}
          </For>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

const TextDisplay = ({
  text,
  availableSpace,
}: {
  text: string;
  availableSpace: Accessor<number>;
}) => {
  const [isOverflowing, setIsOverflowing] = createSignal(false);
  let textRef!: HTMLSpanElement;

  createEffect(() => {
    text;

    setIsOverflowing(textRef.scrollWidth > availableSpace());
  });

  return (
    <div
      class={cn(
        "inline-block overflow-hidden whitespace-nowrap h-full text-foreground",
        `max-w-[${availableSpace()}px]`
      )}
    >
      <div class={isOverflowing() ? "animate-marquee inline-block" : ""}>
        <span ref={textRef} class="inline-block">
          {text}
        </span>
        {isOverflowing() ? (
          <span class="inline-block px-4">{text}</span>
        ) : undefined}
      </div>
      <style>
        {`
      @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
      }

        .animate-marquee {
          animation: marquee 6s linear infinite;
        }
      `}
      </style>
    </div>
  );
};
