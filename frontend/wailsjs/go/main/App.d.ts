// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {logger} from '../models';
import {types} from '../models';
import {main} from '../models';

export function ChangeRootModDir(arg1:string,arg2:boolean):Promise<void>;

export function ClosePrefsDB():Promise<void>;

export function CreateLogger():Promise<logger.Logger>;

export function DevModeEnabled():Promise<boolean>;

export function DownloadModFix(arg1:types.Game,arg2:string,arg3:string,arg4:string):Promise<void>;

export function ForcePanic():Promise<void>;

export function GetExclusionPaths():Promise<Array<string>>;

export function GetExportDirectory():Promise<string>;

export function GetPluginsState():Promise<main.PluginsState>;

export function GetStats():Promise<types.DownloadStats>;

export function GetUpdates():Promise<Array<types.Update>>;

export function LoadPlugins():Promise<void>;

export function OpenDirectoryDialog(arg1:string,arg2:Array<string>):Promise<string>;

export function OpenMultipleFilesDialog(arg1:string,arg2:Array<string>):Promise<Array<string>>;

export function ReadImageFile(arg1:string):Promise<string>;

export function RemoveOldModDir(arg1:string):Promise<void>;

export function StartPlugins():Promise<void>;

export function StopPlugins():Promise<void>;
