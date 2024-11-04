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
![image](https://github.com/user-attachments/assets/699d67ea-fc63-4bee-863f-6c02fc09005e)
![image](https://github.com/user-attachments/assets/e8e2047b-3f8e-489b-ad55-95730760e6e2)
![image](https://github.com/user-attachments/assets/c6b17060-450a-4405-9a79-1774129c2b82)
![image](https://github.com/user-attachments/assets/73c857f4-0bc1-4479-9be0-d474529b3bc0)
![image](https://github.com/user-attachments/assets/f4750b77-a329-4a54-91d0-02ac77dceb1d)
![image](https://github.com/user-attachments/assets/be452e6a-e1f9-4099-88e8-9a264a08ca7a)
![Screenshot_20241103_192022_Hoyomod](https://github.com/user-attachments/assets/bcf701fe-7d33-4a61-852c-393a819fc457)
![Screenshot_20241103_192011_Hoyomod](https://github.com/user-attachments/assets/b6dd73c9-af38-4009-9787-5b11294f2a71)







