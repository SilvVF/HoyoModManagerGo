---
sidebar_position: 1
---

# Overview

Welcome to the **HoyoModManager** documentation. This guide will help you get started with managing mods for Hoyo games and Wuthering Waves.

## Getting Started

To begin, ensure you have the necessary setup and follow the instructions in the [Setup](/docs/tutorial-basics/setup) section.

## Features

- Browse Game Banana mod listings.
- Direct downloads of .rar, .zip, and .7zip files.
- Use alternative textures for mods.
- HTTP server to manage enabled mod state.
- Companion Android app.
- Create and load playlists.
- Runs skin fix .exe automatically when regenerating the mod folder if it exists.
- Dark and light themes using Catapuccin Mocha and Latte.

## Setup
Go to settings and select the Mods folder. It is recommended to create a new folder within 3dmigoto/Mods (e.g., create Mods/managed) to use as this folder. This will decrease the work done when unzipping as no other folders need to be checked.

If you have any previous mods inside the folder that you want to keep, do the following:
Settings > + Add Exclusion Directory > Select any folders that should not be deleted.

All mods are kept inside C:\Users\USER\AppData\Local\HoyoModManagerGo\cache (USER being your user). If space saver is enabled, all mods will be stored in .zip files. To delete all data after deleting the app, delete the root of this folder.

### Button Actions
| Button      | Action      |
|-------------|-------------|
| Generate    | Unzips all files from the mods that are enabled into the games export Dir. |
| Refresh     | Fetches character data and rechecks local mod files for the game. |
| Refresh Local | Rechecks local mod files. (This only needs to be pressed if you dragged a file into the cache/mods/...) |

### Generating
To update the mods folder after toggling the checkboxes, click generate. This will go through the mods that you have enabled and unzip them into the export Directory selected in Settings.

**THIS WILL CLEAR THE FOLDER IF AN EXCLUSION IS NOT SET AND CLEAN EXPORT DIR IS ON (To set this go to settings or see setup)**

It will also fill any keymaps or textures that are selected for the mod.

## Showcase

### Desktop
<img src="https://github.com/user-attachments/assets/7a45dbac-7fa9-41ca-9fd0-c740582de09d" width="500" />
<img src="https://github.com/user-attachments/assets/47a606a8-9cb6-4ad0-9e94-fce8f501fc40" width="500"/>
<img src="https://github.com/user-attachments/assets/c0a9629f-4a89-4c22-8956-1c7f62aad726" width="500"/>
<img src="https://github.com/user-attachments/assets/ca3013d5-176c-4827-b8fa-5a885ae46264" width="500"/>
<img src="https://github.com/user-attachments/assets/b2b9f9df-805f-481c-8f96-90b98f7a170d" width="500"/>
<img src="https://github.com/user-attachments/assets/6bd7c07d-df9f-4c52-be1e-2657ab235f41" width="500"/>
<img src="https://github.com/user-attachments/assets/dd2396ce-b5de-4d0c-806b-2f85c48b20e3" width="500"/>
<img src="https://github.com/user-attachments/assets/61cb2762-6aa4-4b17-928a-48a8ee0822db" width="500"/>

### Android
<img src="https://github.com/user-attachments/assets/2e18e498-6216-468f-a0a8-4540623bfd8f" width="200"/>
<img src="https://github.com/user-attachments/assets/eea00524-6581-4962-92bd-30bfa65e1224" width="200"/>

## Development

For development instructions, refer to the [Development](/docs/tutorial-basics/development) section. 