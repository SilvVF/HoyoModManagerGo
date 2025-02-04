# Skin mod manager for Hoyo games and Wuthering Waves.
* Browse Game Banana mod listsings.
* Direct downloads of .rar .zip and .7zip files.
* Use alternative textures for mods.
* Http server to manage enabled mod state.
* Companion Android app.
* Create and load playlists.
* Runs skin fix .exe automatically when regenerating the mod folder if exists.
* Dark and light themes using Catapuccin Mocha and Latte.

# Setup
Go to settings and select the Mods folder.
It is recommended to create a new folder within 3dmigoto/Mods (ex. create Mods/managed) to use as this folder
this will decrease the work done when unzipping as no other folders need to be checked.

If you have any previous mods inside the folder that you want to keep do the following
Settings >  + Add Exclusion Directory > Select any folders that should not be deleted.\

All mods are kept inside C:\Users\USER\AppData\Local\HoyoModManagerGo\cache
USER being your user. if space saver is enabled all mods will be stored in .zip files.
To delete all data after deleting the app delete the root of this folder. 

### Generating 
To update the mods folder after toggling the checkboxes click generate. 
This will go through the mods that you have enabled and unzip them into the export Directory selected in Settings.

<b>THIS WILL CLEAR THE FOLDER IF AN EXLUSION IS NOT SET AND CLEAN EXPORT DIR IS ON (To set this go to settings or see setup)</b>

It will also fill any keymaps or textures that are selected for the mod.

### Building and running.

uses C go for sqlite3 and sqlc. to run on windows you can use mingw https://www.mingw-w64.org/

```console
cd frontend
```

```console
npm install
```

### Installing Components
To install components, use shadcn's CLI tool to install

More info here: https://ui.shadcn.com/docs/cli#add

Example:
```console
npx shadcn-ui@latest add [component]
```

## Live Development

To run in live development mode, run `wails dev` in the project directory
for hot reload when editing go code use to avoid rosedb single process issues `wails dev -appargs -dev true` in this mode you can close the db.

## Building

To build a redistributable, production mode package, use `wails build`.

## Android 

select import project and choose dir `android/Hoyomod`
requires android studio version compatible with AGP version 8.4.2

sync gradle and hit run button or 
```console
./gradlew build run
```


## Libs / Tech stack
- [WAILS](https://wails.io/)
- [Go](https://go.dev/)
- [RoseDB](https://github.com/rosedblabs/rosedb)
- [sqlc](https://sqlc.dev/)
- [sqlite](https://www.sqlite.org/index.html)
- [shadcn/ui](https://ui.shadcn.com/)
- [tailwind](https://tailwindcss.com/)
- [unarr](https://github.com/gen2brain/go-unarr)
- [xtractr](https://github.com/golift/xtractr)
- [pond](https://github.com/alitto/pond)

## Game data / images sources
- [Game Bannana](https://gamebanana.com/)
- [genshin-db](https://github.com/theBowja/genshin-db/)
- [genshin optimizer](https://github.com/frzyc/genshin-optimizer)
- [mar7th](https://github.com/Mar-7th)
- [prydwen](https://www.prydwen.gg)
  
## Showcase

### Desktop
<img src="https://github.com/user-attachments/assets/7a45dbac-7fa9-41ca-9fd0-c740582de09d" width="500">
<img src="https://github.com/user-attachments/assets/47a606a8-9cb6-4ad0-9e94-fce8f501fc40" width="500">
<img src="https://github.com/user-attachments/assets/c0a9629f-4a89-4c22-8956-1c7f62aad726" width="500">
<img src="https://github.com/user-attachments/assets/ca3013d5-176c-4827-b8fa-5a885ae46264" width="500">
<img src="https://github.com/user-attachments/assets/b2b9f9df-805f-481c-8f96-90b98f7a170d" width="500">
<img src="https://github.com/user-attachments/assets/6bd7c07d-df9f-4c52-be1e-2657ab235f41" width="500">
<img src="https://github.com/user-attachments/assets/dd2396ce-b5de-4d0c-806b-2f85c48b20e3" width="500">
<img src="https://github.com/user-attachments/assets/61cb2762-6aa4-4b17-928a-48a8ee0822db" width="500">

### Android
<img src="https://github.com/user-attachments/assets/117a83e5-42d8-41c4-9bbc-c7c6c01f44d5" width="200">
<img src="https://github.com/user-attachments/assets/3f6291b6-c79e-4a93-829b-e7dda34210e8" width="200">
<img src="https://github.com/user-attachments/assets/577f9bea-60ff-4561-9274-4788dcc2fc47" width="200">




