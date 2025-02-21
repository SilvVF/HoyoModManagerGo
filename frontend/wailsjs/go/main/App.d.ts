// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {logger} from '../models';
import {main} from '../models';
import {types} from '../models';

export function ClosePrefsDB():Promise<void>;

export function CreateLogger():Promise<logger.Logger>;

export function DevModeEnabled():Promise<boolean>;

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

export function StartPlugins():Promise<void>;

export function StopPlugins():Promise<void>;
