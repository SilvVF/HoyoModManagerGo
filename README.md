# Skin mod manager for Hoyo games and Wuthering Waves.
* Browse Game Banana mod listsings.
* Direct downloads of .rar .zip and .7zip files.
* Use alternative textures for mods.
* Http server to manage enabled mod state.
* Companion Android app.
* Create and load playlists.
* Runs skin fix .exe automatically when regenerating the mod folder if exists.
* Dark and light themes using Catapuccin Mocha and Latte.

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
for hot reload when editing go code use to avoid rosedb single process issues `wails dev -appargs "debug"`.

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
![image](https://github.com/user-attachments/assets/2e1d1883-8f49-421d-b4b2-4e6f1f0f36c9)
![image](https://github.com/user-attachments/assets/47a606a8-9cb6-4ad0-9e94-fce8f501fc40)
![image](https://github.com/user-attachments/assets/c0a9629f-4a89-4c22-8956-1c7f62aad726)
![image](https://github.com/user-attachments/assets/ca3013d5-176c-4827-b8fa-5a885ae46264)
![image](https://github.com/user-attachments/assets/b2b9f9df-805f-481c-8f96-90b98f7a170d)
![image](https://github.com/user-attachments/assets/6bd7c07d-df9f-4c52-be1e-2657ab235f41)
![image](https://github.com/user-attachments/assets/65be9010-42b2-4c9a-b50c-4f97ffd055a0)
![image](https://github.com/user-attachments/assets/61cb2762-6aa4-4b17-928a-48a8ee0822db)
### Android
<img src="https://github.com/user-attachments/assets/bcf701fe-7d33-4a61-852c-393a819fc457" width="200">
<img src="https://github.com/user-attachments/assets/b6dd73c9-af38-4009-9787-5b11294f2a71" width="200">







